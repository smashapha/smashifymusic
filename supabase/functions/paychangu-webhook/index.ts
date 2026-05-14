import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const PAYCHANGU_WEBHOOK_SECRET = Deno.env.get("PAYCHANGU_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const signature = req.headers.get('x-paychangu-signature')
    const bodyText = await req.text()
    
    // 1. Verify Webhook Signature
    // In a real environment, you'd use HMAC with PAYCHANGU_WEBHOOK_SECRET
    // PayChangu's signature verification method should be followed strictly.
    // Assuming standard HMAC-SHA256 for this implementation logic.
    if (!signature) {
      return new Response('No signature', { status: 401 });
    }
    const hmac = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(PAYCHANGU_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const verified = await crypto.subtle.verify(
      "HMAC",
      hmac,
      hexToBytes(signature || ""),
      new TextEncoder().encode(bodyText)
    );
    if (!verified) return new Response('Unauthorized', { status: 401 });

    const payload = JSON.parse(bodyText)
    const { tx_ref, status, amount } = payload
    const meta = payload.meta || {} // Custom data from create-payment

    // 2. Fetch Transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('paychangu_ref', tx_ref)
      .single()

    if (txError || !transaction) {
      console.error(`Transaction not found: ${tx_ref}`)
      return new Response('Ok', { status: 200 }) // Return 200 to stop retries
    }

    if (transaction.status === 'completed' || transaction.status === 'failed') {
      return new Response('Ok', { status: 200 }) // Already processed
    }

    // 3. Handle Failed Payment
    if (status !== 'successful') {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id)
      return new Response('Ok', { status: 200 })
    }

    // 4. Process Successful Payment based on Type
    const type = tx_ref.split('-')[1] // Extract type from SMASH-{TYPE}-...
    const { userId, artistId, songId, plan, tier, plays, anonymous } = transaction.metadata || {}

    // Update transaction to completed first (to prevent races)
    await supabase.from('transactions').update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', transaction.id)

    // Log the webhook
    await supabase.from('webhook_logs').insert({
      tx_ref,
      type,
      status: 'processed',
      payload: bodyText
    })

    // HANDLERS
    switch (type) {
      case 'TRACK_PURCHASE':
        // Record purchase
        await supabase.from('fan_purchases').insert({ fan_id: userId, song_id: songId, transaction_id: transaction.id })
        // Increment sales count
        await supabase.rpc('increment_song_sales', { s_id: songId })
        
        // Payout Handle: Net amount to artist wallet
        const saleFee = 0.15; // Fallback or lookup from tier
        const saleNet = amount * (1 - saleFee);
        await supabase.rpc('increment_wallet_balance', { p_id: artistId, amount: saleNet });
        break;

      case 'TIP':
        const tipFee = 0.10;
        const tipNet = amount * (1 - tipFee);
        await supabase.rpc('increment_wallet_balance', { p_id: artistId, amount: tipNet });

        if (!anonymous) {
            await supabase.from('notifications').insert({
              user_id: artistId,
              user_type: 'artist',
              type: 'tip_received',
              message: `You received a MWK ${amount.toLocaleString()} tip! (Net: MWK ${tipNet.toLocaleString()}) 💸`,
              link: '/artist-hub#dashboard'
            })
        }
        break;

      case 'FAN_SUBSCRIPTION':
        const renewsAt = new Date()
        renewsAt.setDate(renewsAt.getDate() + 30)
        await supabase.from('fan_subscriptions').upsert({
          fan_id: userId,
          artist_id: artistId,
          status: 'active',
          next_billing_at: renewsAt.toISOString()
        })
        await supabase.from('notifications').insert({
          user_id: artistId,
          user_type: 'artist',
          type: 'subscription_started',
          message: `A fan just started a monthly subscription! MWK ${amount.toLocaleString()} 💖`,
          link: '/artist-hub#fans'
        })
        break;

      case 'LISTENER_PREMIUM':
      case 'LISTENER_FAMILY':
        const subEnds = new Date()
        subEnds.setDate(subEnds.getDate() + 30)
        await supabase.from('user_profiles').update({
          subscription_tier: type === 'LISTENER_PREMIUM' ? 'Premium' : 'Family',
          subscription_ends: subEnds.toISOString()
        }).eq('id', userId)
        break;

      case 'ARTIST_RISING_STAR':
      case 'ARTIST_STANDARD':
      case 'ARTIST_ELITE':
        const artistTierEnds = new Date()
        artistTierEnds.setDate(artistTierEnds.getDate() + 365) // Yearly for studio tiers
        const tierName = type.split('_')[1].toLowerCase() === 'rising' ? 'rising_star' : type.split('_')[1].toLowerCase()
        await supabase.from('profiles').update({
          subscription_tier: tierName,
          subscription_ends: artistTierEnds.toISOString(),
          approved: true
        }).eq('id', userId)
        break;

      case 'ARTIST_AD_CAMPAIGN':
        await supabase.from('audio_ads').insert({
          artist_id: userId,
          type: 'promo',
          plays_purchased: plays,
          active: false // Needs admin review
        })
        // Notify admin (if admin email/id known, or just log)
        break;
    }

    return new Response('Success', { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal error', { status: 200 }) // Return 200 to prevent PayChangu retrying broken code
  }
})

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
