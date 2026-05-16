import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const body = await req.json()
    console.log("Payout Webhook received:", body)
    
    // Handle both direct and nested data patterns
    const data = body.data || body
    const reference = data.reference
    const status = data.status
    const amount = Number(data.amount)

    // 1. Find Payout Request
    const { data: payout, error: payoutError } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('reference', reference)
      .single()

    if (payoutError || !payout) {
      return new Response('Not found', { status: 200 })
    }

    if (payout.status === 'paid' || payout.status === 'failed') {
      return new Response('Ok', { status: 200 })
    }

    // 2. Handle Success
    if (status === 'successful') {
      await supabase.from('payout_requests').update({
        status: 'paid',
        processed_at: new Date().toISOString()
      }).eq('id', payout.id)

      await supabase.from('transactions').insert({
        artist_id: payout.artist_id,
        type: 'withdrawal',
        gross_amount: amount,
        status: 'completed',
        paychangu_ref: reference,
        description: `Withdrawal to ${payout.network}`
      })

      await supabase.from('notifications').insert({
        profile_id: payout.artist_id,
        user_type: 'artist',
        type: 'payout_sent',
        message: `MK ${amount.toLocaleString()} has been sent to your ${payout.network} number 🎉`,
        link: '/artist-hub#wallet'
      })
    } 
    // 3. Handle Failure
    else if (status === 'failed') {
      await supabase.from('payout_requests').update({ status: 'failed' }).eq('id', payout.id)
      
      // REFUND WALLET
      const { data: artist } = await supabase.from('profiles').select('wallet_balance').eq('id', payout.artist_id).single()
      const amountToRefund = payout.requested_amount || payout.amount || payout.payout_amount || 0;
      
      await supabase.from('profiles').update({
        wallet_balance: (artist?.wallet_balance || 0) + amountToRefund
      }).eq('id', payout.artist_id)

      await supabase.from('notifications').insert({
        profile_id: payout.artist_id,
        user_type: 'artist',
        type: 'payout_failed',
        message: `Your withdrawal failed. MK ${amountToRefund.toLocaleString()} returned to your wallet.`,
        link: '/artist-hub#payouts'
      })
    }

    return new Response('Ok', { status: 200 })
  } catch (error) {
    console.error('Payout webhook error:', error)
    return new Response('Ok', { status: 200 })
  }
})
