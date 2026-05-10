import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) throw new Error('Unauthorized')

    const { amount, phone, network } = await req.json()

    // 2. Validate Request
    const { data: artist, error: artistError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (artistError || !artist) throw new Error('Artist profile not found')
    if (artist.wallet_balance < amount) throw new Error('Insufficient wallet balance')
    if (amount < 2000) throw new Error('Minimum withdrawal is MK 2,000')

    // 3. Pessimistically Deduct from Wallet
    const { data: updatedArtist, error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: artist.wallet_balance - amount })
      .eq('id', user.id)
      .gte('wallet_balance', amount) // Atomic check
      .select()
      .single()

    if (updateError || !updatedArtist) throw new Error('Failed to update balance. Check your funds.')

    const payoutRef = `WD-${user.id}-${Date.now()}`

    // 4. Record Payout Request
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
        // Rollback balance if recording failed
        await supabase.from('profiles').update({ wallet_balance: artist.wallet_balance }).eq('id', user.id)
        throw payoutReqError
    }

    // 5. Initialize Payout via PayChangu (Mobile Money)
    // Note: Endpoint per PayChangu docs for mobile money transfers
    const response = await fetch('https://api.paychangu.com/mobile-money/transfers/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'MWK',
        phone,
        network, // AIRTEL or TNM
        reference: payoutRef,
        first_name: artist.full_name?.split(' ')[0] || 'Artist',
        last_name: artist.full_name?.split(' ').slice(1).join(' ') || '',
      })
    })

    const payload = await response.json()

    if (!response.ok) {
        // REFUND Wallet on failure
        await supabase.from('profiles').update({ wallet_balance: artist.wallet_balance }).eq('id', user.id)
        await supabase.from('payout_requests').update({ status: 'failed', error_message: payload.message }).eq('id', payoutReq.id)
        throw new Error(payload.message || 'PayChangu payout initialization failed')
    }

    // 6. Update Request with PayChangu ref
    await supabase.from('payout_requests').update({ 
      status: 'pending',
      paychangu_reference: payload.data?.reference 
    }).eq('id', payoutReq.id)

    return new Response(JSON.stringify({ success: true, reference: payoutRef }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
