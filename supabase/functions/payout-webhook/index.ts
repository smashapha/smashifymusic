import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const PAYCHANGU_WEBHOOK_SECRET = Deno.env.get("PAYCHANGU_WEBHOOK_SECRET") || Deno.env.get("PAYCHANGU_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const bodyText = await req.text()

    // 1. Verify Webhook Signature
    if (!PAYCHANGU_WEBHOOK_SECRET) {
      console.error("WEBHOOK_SECRET is not configured — rejecting request")
      return new Response("Webhook secret not configured", { status: 500 })
    }

    const signature = req.headers.get("x-paychangu-signature")
    if (!signature) {
      console.error("Payout Webhook: Missing signature header")
      return new Response("Unauthorized - Missing Signature", { status: 401 })
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(PAYCHANGU_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const signatureBytes = hexToBytes(signature)
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(bodyText),
    )

    if (!isValid) {
      console.error("Payout Webhook: Invalid signature")
      return new Response("Invalid signature", { status: 401 })
    }

    const body = JSON.parse(bodyText)
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
      // Duplicate protection - only refund if still pending
      if (payout.status !== 'pending') {
        return new Response('Already processed', { status: 200 })
      }

      await supabase.from('payout_requests')
        .update({ status: 'failed' })
        .eq('id', payout.id)

      const amountToRefund = Number(payout.requested_amount || 0)
      if (amountToRefund > 0) {
        await supabase.rpc('increment_wallet', {
          artist_id: payout.artist_id,
          amount: amountToRefund
        })
      }

      await supabase.from('notifications').insert({
        profile_id: payout.artist_id,
        user_type: 'artist',
        type: 'payout_failed',
        message: `Your withdrawal of MK ${amountToRefund.toLocaleString()} failed. Amount returned to your wallet.`,
        link: '/artist-hub#wallet'
      })
    }

    return new Response('Ok', { status: 200 })
  } catch (error) {
    console.error('Payout webhook error:', error)
    return new Response('Ok', { status: 200 })
  }
})

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}
