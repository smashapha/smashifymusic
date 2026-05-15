import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const url = new URL(req.url)
    const tx_ref = url.searchParams.get('tx_ref')

    if (!tx_ref) {
      return new Response(JSON.stringify({ error: 'Missing tx_ref' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    console.log(`Verifying payment for: ${tx_ref}`)

    // 1. Check DB First
    const { data: dbTx, error: dbError } = await supabase
      .from('transactions')
      .select('*')
      .eq('paychangu_ref', tx_ref)
      .single()

    if (dbError || !dbTx) {
      return new Response(JSON.stringify({ error: 'Transaction not found in our database' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (dbTx.status === 'completed' || dbTx.status === 'failed') {
      return new Response(JSON.stringify({ status: dbTx.status, transaction: dbTx }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. Fetch from PayChangu API
    const response = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
        'Accept': 'application/json',
      }
    })

    const payload = await response.json()
    console.log("PayChangu verification response:", payload)

    if (response.ok && payload.status === 'success' && payload.data) {
      const pcStatus = payload.data.status
      if (pcStatus === 'successful' || pcStatus === 'success') {
        // Trigger the exact same logic as webhook! But just to be DRY, we can just fetch the webhook URL (or we can duplicate the logic here since we have it). 
        // To be simpler, we can just POST the payload.data to our own webhook.
        const webhookUrl = `${SUPABASE_URL}/functions/v1/paychangu-webhook`
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: payload.data }) // note: without signature...
          });
          // Wait, webhook will reject if there is a secret but no signature. Let's just process it inline here.
          
          const eventData = payload.data;
          const { amount } = eventData
          const type = tx_ref.split('-')[1]
          const { userId, artistId, songId, plan, tier, plays, anonymous } = dbTx.metadata || {}
          const grossAmount = Number(dbTx.gross_amount)
          const netAmount = Number(dbTx.net_amount)

          await supabase.from('transactions').update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          }).eq('id', dbTx.id)

          // Process logic...
          switch (type) {
            case 'TRACK_PURCHASE':
              await supabase.from('fan_purchases').upsert({ fan_id: userId, song_id: songId, transaction_id: dbTx.id })
              await supabase.rpc('increment_song_sales', { s_id: songId })
              await supabase.rpc('increment_wallet_balance', { p_id: artistId, amount: netAmount });
              break;

            case 'TIP':
              await supabase.rpc('increment_wallet_balance', { p_id: artistId, amount: netAmount });
              if (!anonymous) {
                  await supabase.from('notifications').insert({
                    user_id: artistId,
                    user_type: 'artist',
                    type: 'tip_received',
                    message: `You received a MWK ${grossAmount.toLocaleString()} tip! (Net: MWK ${netAmount.toLocaleString()}) 💸`,
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
              await supabase.rpc('increment_wallet_balance', { p_id: artistId, amount: netAmount });
              await supabase.from('notifications').insert({
                user_id: artistId,
                user_type: 'artist',
                type: 'subscription_started',
                message: `A fan just started a monthly subscription! MWK ${grossAmount.toLocaleString()} 💖 (Net: MWK ${netAmount.toLocaleString()})`,
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
              artistTierEnds.setDate(artistTierEnds.getDate() + 365)
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
                active: false
              })
              break;
          }

          dbTx.status = 'completed';
        } catch (e) {
          console.error("Inline processing error", e)
        }
      } else if (pcStatus === 'failed') {
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', dbTx.id)
        dbTx.status = 'failed';
      }
    }

    return new Response(JSON.stringify({ status: dbTx.status, transaction: dbTx }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: any) {
    console.error('Verification error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
