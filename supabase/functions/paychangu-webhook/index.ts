import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const PAYCHANGU_WEBHOOK_SECRET = Deno.env.get("PAYCHANGU_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const url = new URL(req.url)

    // Handle browser redirects (GET requests)
    if (req.method === 'GET') {
      const tx_ref = url.searchParams.get('tx_ref') || url.searchParams.get('reference')
      
      if (tx_ref) {
        // Fetch transaction to know where to redirect
        const { data: transaction } = await supabase
          .from('transactions')
          .select('metadata')
          .eq('paychangu_ref', tx_ref)
          .single()

        const type = tx_ref.split('-')[1]; // e.g. SMASH-TRACK_PURCHASE-123
        let redirectPath = '/';

        if (type === 'TRACK_PURCHASE') {
          redirectPath = `/purchase-success?song_id=${transaction?.metadata?.songId || ''}&tx_ref=${tx_ref}`
        } else if (type === 'TIP') {
          redirectPath = `/tip-success?artist_id=${transaction?.metadata?.artistId || ''}&tx_ref=${tx_ref}`
        } else if (type === 'FAN_SUBSCRIPTION') {
          redirectPath = `/subscribe-success?artist_id=${transaction?.metadata?.artistId || ''}&tx_ref=${tx_ref}`
        } else if (type === 'LISTENER_PREMIUM' || type === 'LISTENER_FAMILY') {
          redirectPath = `/upgrade-success?plan=${transaction?.metadata?.plan || 'Premium'}&tx_ref=${tx_ref}`
        } else if (type?.startsWith('ARTIST_') && type !== 'ARTIST_AD_CAMPAIGN') {
          redirectPath = `/tier-success?tier=${type.split('_')[1]}&tx_ref=${tx_ref}`
        } else if (type === 'ARTIST_AD_CAMPAIGN') {
          redirectPath = `/ad-success?tx_ref=${tx_ref}`
        } else {
          redirectPath = `/?payment_success=true&tx_ref=${tx_ref}`
        }

        // Redirect back to the SMA frontend
        return Response.redirect(`https://play-smashify.vercel.app${redirectPath}`, 302)
      }
      return Response.redirect('https://play-smashify.vercel.app/', 302)
    }

    // --- Webhook POST processing ---
    const signature = req.headers.get('x-paychangu-signature')
    const bodyText = await req.text()
    
    // 1. Verify Webhook Signature (If secret is present)
    if (PAYCHANGU_WEBHOOK_SECRET && signature) {
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
      if (!verified) {
          console.error("Webhook signature mismatch");
          return new Response('Unauthorized', { status: 401 });
      }
    } else {
      console.warn("Skipping Payload Signature Verification (Missing Secret or Header)")
    }

    const payload = JSON.parse(bodyText)
    // PayChangu sends data in multiple possible structures
    const eventData = payload.data || payload;
    const tx_ref = eventData.tx_ref || payload.tx_ref || eventData.reference || payload.reference;
    const status = eventData.status || payload.status;
    const amount = Number(eventData.amount || payload.amount || 0);

    // 2. Fetch Transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('paychangu_ref', tx_ref)
      .single()

    // payment_type in metadata is stored as lowercase e.g. 'listener_premium'
    // Convert it to uppercase for switch matching. If not in metadata, use regex fallback immune to UUID hyphens.
    const metaType = transaction?.metadata?.payment_type;
    const type = metaType
      ? metaType.toUpperCase()
      : (tx_ref.match(/^SMASH-([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*)-/)?.[1] || '').toUpperCase();

    console.log('Resolved type:', type);
    console.log('Meta payment_type:', metaType);
    const meta = transaction?.metadata || eventData.meta || payload.meta || {};

    console.log('Full payload:', bodyText);
    console.log('Parsed tx_ref:', tx_ref);
    console.log('Parsed status:', status);
    console.log('Transaction found:', transaction?.id);
    console.log('Type:', type);
    console.log('Metadata:', JSON.stringify(transaction?.metadata));

    if (txError || !transaction) {
      console.error(`Transaction not found: ${tx_ref}`)
      return new Response('Ok', { status: 200 }) // Return 200 to stop retries
    }

    if (transaction.status === 'completed' || transaction.status === 'failed') {
      return new Response('Ok', { status: 200 }) // Already processed
    }

    // 3. Handle Failed Payment
    const isSuccess = ['successful', 'success', 'SUCCESSFUL', 'SUCCESS', 'paid', 'PAID'].includes(status);
    if (!isSuccess) {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id)
      return new Response('Ok', { status: 200 })
    }

    // 4. Process Successful Payment based on Type
    const { artistId, songId, plan, tier, plays, anonymous } = transaction.metadata || {}
    const userId = transaction.metadata?.userId || transaction.fan_id
    const netAmount = Number(transaction.net_amount)
    const grossAmount = Number(transaction.gross_amount)

    // Update transaction to completed first (to prevent races)
    await supabase.from('transactions').update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', transaction.id)

    // Log the webhook
    await supabase.from('webhook_logs').insert({
      tx_ref,
      type: type,
      status: 'processed',
      payload: bodyText
    })

    // HANDLERS
    switch (type) {
      case 'TRACK_PURCHASE': {
        // Record purchase - Using upsert to be idempotent
        const { error: fanError } = await supabase.from('fan_purchases').upsert({ 
          fan_id: userId, 
          song_id: songId, 
          transaction_id: transaction.id,
          amount: grossAmount,
          status: 'completed',
          purchased_at: new Date().toISOString()
        }, { onConflict: 'fan_id,song_id' })
        
        if (fanError) console.error('fan_purchases insert error:', fanError);
        // Increment sales count safely
        const { data: songData } = await supabase.from('songs').select('sales').eq('id', songId).single()
        const currentSales = Number(songData?.sales || 0)
        await supabase.from('songs').update({ sales: currentSales + 1 }).eq('id', songId)
        
        const { data: profileData } = await supabase.from('profiles').select('wallet_balance').eq('id', artistId).single()
        const currentBalance = Number(profileData?.wallet_balance || 0)
        await supabase.from('profiles').update({ wallet_balance: currentBalance + netAmount }).eq('id', artistId)
        
        await supabase.from('notifications').insert({
          profile_id: artistId,
          user_type: 'artist',
          type: 'track_sold',
          message: `You sold a track! MWK ${grossAmount.toLocaleString()} earned. 💿`,
          link: '/artist-hub#dashboard'
        })
        break;
      }

      case 'TIP': {
        const { data: profileData } = await supabase.from('profiles').select('wallet_balance').eq('id', artistId).single()
        const currentBalance = Number(profileData?.wallet_balance || 0)
        await supabase.from('profiles').update({ wallet_balance: currentBalance + netAmount }).eq('id', artistId)

        if (!anonymous) {
            await supabase.from('notifications').insert({
              profile_id: artistId,
              user_type: 'artist',
              type: 'tip_received',
              message: `You received a MWK ${grossAmount.toLocaleString()} tip! (Net: MWK ${netAmount.toLocaleString()}) 💸`,
              link: '/artist-hub#dashboard'
            })
        }
        break;
      }

      case 'FAN_SUBSCRIPTION': {
        const renewsAt = new Date()
        renewsAt.setDate(renewsAt.getDate() + 30)
        const { error: subError } = await supabase
          .from('fan_subscriptions')
          .upsert({
            fan_id: userId,
            artist_id: artistId,
            status: 'active',
            amount: grossAmount,
            started_at: new Date().toISOString(),
            next_billing_at: renewsAt.toISOString()
          }, { onConflict: 'fan_id,artist_id' })

        if (subError) {
          console.error('fan_subscriptions upsert error:', subError)
        } else {
          console.log('Fan subscription activated for artist:', artistId)
        }

        // Credit artist wallet with net amount
        const { data: artistWallet } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', artistId)
          .single()

        const newBalance = Number(artistWallet?.wallet_balance || 0) + netAmount
        const { error: walletError } = await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', artistId)

        if (walletError) console.error('Artist wallet credit error:', walletError)
        else console.log('Artist wallet credited:', netAmount, 'new balance:', newBalance)
        
        await supabase.from('notifications').insert({
          profile_id: artistId,
          user_type: 'artist',
          type: 'subscription_started',
          message: `A fan just started a monthly subscription! MWK ${grossAmount.toLocaleString()} 💖 (Net: MWK ${netAmount.toLocaleString()})`,
          link: '/artist-hub#fans'
        })
        break;
      }

      case 'LISTENER_PREMIUM':
      case 'LISTENER_FAMILY':
        const subEnds = new Date()
        subEnds.setDate(subEnds.getDate() + 30)
        const subTierName = type === 'LISTENER_PREMIUM' ? 'Premium' : 'Family'
        // userId from metadata, also try fan_id as fallback
        const listenerId = userId || meta.fan_id || meta.userId
        console.log('Upgrading listener:', listenerId, 'to tier:', subTierName)
        
        const { error: listenerTierError } = await supabase
          .from('user_profiles')
          .update({
            subscription_tier: subTierName,
            subscription_ends: subEnds.toISOString()
          })
          .eq('id', listenerId)
        
        if (listenerTierError) {
          console.error('Listener tier update error:', listenerTierError)
        } else {
          console.log('Listener tier updated successfully')
        }

        // Update profiles to handle artist-as-listener cases
        await supabase.from('profiles').update({
          subscription_tier: subTierName,
          subscription_ends: subEnds.toISOString()
        }).eq('id', listenerId)
        break;

      case 'ARTIST_RISING_STAR':
      case 'ARTIST_STANDARD':
      case 'ARTIST_ELITE':
        const artistTierEnds = new Date()
        artistTierEnds.setMonth(artistTierEnds.getMonth() + 6) // Artist tiers are billed every 6 months
        const tierMap: Record<string,string> = {
          'ARTIST_RISING_STAR': 'RisingStar',
          'ARTIST_STANDARD': 'Standard', 
          'ARTIST_ELITE': 'Elite'
        }
        const artistTierName = tierMap[type] || 'Free'
        const { error: tierError } = await supabase.from('profiles').update({
          subscription_tier: artistTierName,
          artist_tier: artistTierName,
          subscription_ends: artistTierEnds.toISOString(),
          approved: true
        }).eq('id', userId)
        if (tierError) {
          console.error('Artist tier update error:', tierError)
        } else {
          console.log('Artist tier updated to:', artistTierName, 'for user:', userId)
          // Also grant premium listener features
          // Crucial fix: Use upsert with onConflict: 'id' so that new artist users who do not have
          // a row in user_profiles yet will successfully have it created, rather than a silent failure.
          const { error: listenerUpsertError } = await supabase
            .from('user_profiles')
            .upsert({
              id: userId,
              subscription_tier: 'Premium',
              subscription_ends: artistTierEnds.toISOString()
            }, { onConflict: 'id' })

          if (listenerUpsertError) {
            console.error('Failed to upsert Premium listener features for artist:', listenerUpsertError)
          } else {
            console.log('Successfully upserted Premium listener features for artist:', userId)
          }
        }
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
