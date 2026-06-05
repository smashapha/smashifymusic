import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_ORIGINS = ['https://play-smashify.vercel.app', 'http://localhost:5173']

function getCorsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': "*",
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

Deno.serve(async (req) => {
  console.log("Payout Function: Request received", req.method)
  const corsHeaders = getCorsHeaders(req)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

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
    console.log("Payout Function: Processing manual payout request:", { amount, phone, network, user: user.id })

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
      .rpc('decrement_wallet', { artist_id: user.id, amount })
      .single()

    if (updateError || !updatedArtist) {
      console.error("Payout Function: Balance update error:", updateError)
      throw new Error('Failed to update balance. Check your funds.')
    }

    const payoutRef = `WD-${user.id}-${Date.now()}`

    // 4. Record Payout Request - Directly set as 'pending' for Admin review
    console.log("Payout Function: Recording manual payout request...")
    const { data: payoutReq, error: payoutReqError } = await supabase
      .from('payout_requests')
      .insert({
        artist_id: user.id,
        requested_amount: amount,
        phone,
        network,
        status: 'pending', // Directly set to pending so that the administrator can process it manually from their panel
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

    // 5. Record in Transactions table for history as pending
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

    console.log("Payout Function: Manual payout request registered successfully!")

    return new Response(JSON.stringify({ 
      success: true, 
      reference: payoutRef,
      message: 'Withdrawal request submitted! Please wait for a moment while we verify your payout.'
    }), {
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
