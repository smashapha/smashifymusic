import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log("Payout Function: Request received", req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY")
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!PAYCHANGU_SECRET_KEY) throw new Error("PAYCHANGU_SECRET_KEY is missing in Secrets")
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is missing in Secrets")
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in Secrets")

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error("Payout Function: Auth error:", authError)
      throw new Error('Unauthorized')
    }

    const { amount, phone, network } = await req.json()
    console.log("Payout Function: Processing:", { amount, phone, network, user: user.id })

    // 2. Validate Request
    const { data: artist, error: artistError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (artistError || !artist) {
      console.error("Payout Function: Profile not found:", artistError)
      throw new Error('Artist profile not found')
    }
    if (artist.wallet_balance < amount) throw new Error('Insufficient wallet balance')
    if (amount < 2000) throw new Error('Minimum withdrawal is MK 2,000')

    // 3. Pessimistically Deduct from Wallet
    console.log("Payout Function: Deducting from wallet...")
    const { data: updatedArtist, error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: artist.wallet_balance - amount })
      .eq('id', user.id)
      .gte('wallet_balance', amount) // Atomic check
      .select()
      .single()

    if (updateError || !updatedArtist) {
      console.error("Payout Function: Balance update error:", updateError)
      throw new Error('Failed to update balance. Check your funds.')
    }

    const payoutRef = `WD-${user.id}-${Date.now()}`

    // 4. Record Payout Request
    console.log("Payout Function: Recording payout request...")
    const { data: payoutReq, error: payoutReqError } = await supabase
      .from('payout_requests')
      .insert({
        artist_id: user.id,
        requested_amount: amount,
        phone,
        network,
        status: 'processing',
        reference: payoutRef
      })
      .select()
      .single()

    if (payoutReqError) {
        console.error("Payout Function: Insert error:", payoutReqError)
        // Rollback balance if recording failed
        await supabase.from('profiles').update({ wallet_balance: artist.wallet_balance }).eq('id', user.id)
        throw payoutReqError
    }

    // 4.1 Record in Transactions table for history
    console.log("Payout Function: Recording in transactions table...")
    await supabase.from('transactions').insert({
      artist_id: user.id,
      type: 'withdrawal',
      gross_amount: amount,
      net_amount: amount,
      status: 'pending',
      reference: payoutRef,
      description: `Withdrawal to ${network} (${phone})`
    })

    // 5. Initialize Payout via PayChangu
    console.log("Payout Function: Calling PayChangu Payout API...")
    // Standard endpoint for mobile money transfer is /mobile-money/transfer (singular)
    const cleanKey = PAYCHANGU_SECRET_KEY.trim()
    const response = await fetch('https://api.paychangu.com/mobile-money/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'MWK',
        mobile: phone,
        service: network.toLowerCase(), // airtel or tnm
        reference: payoutRef,
        callback_url: `${SUPABASE_URL}/functions/v1/payout-webhook`
      })
    })

    const responseText = await response.text();
    console.log(`PayChangu Response (${response.status}):`, responseText);

    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch (err) {
      throw new Error(`PayChangu returned non-JSON (${response.status}): ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
        console.error("Payout Function: PayChangu Error Detail:", payload)
        // REFUND Wallet on failure
        await supabase.from('profiles').update({ wallet_balance: artist.wallet_balance }).eq('id', user.id)
        await supabase.from('payout_requests').update({ status: 'failed', error_message: payload.message || responseText }).eq('id', payoutReq.id)
        throw new Error(payload.message || `PayChangu API error: ${response.status}`)
    }

    // 6. Update Request with PayChangu ref
    console.log("Payout Function: Finalizing request in DB...")
    await supabase.from('payout_requests').update({ 
      status: 'pending',
      paychangu_reference: payload.data?.reference 
    }).eq('id', payoutReq.id)

    return new Response(JSON.stringify({ success: true, reference: payoutRef }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Payout Function Global Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
