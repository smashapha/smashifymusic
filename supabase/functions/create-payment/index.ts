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
    const { amount, email, first_name, last_name, type, tx_ref, meta, return_url, currency, callback_url } = await req.json()

    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 2. Map Payment Description
    const descriptions: Record<string, string> = {
      'track_purchase': `Purchase of music track on Smashify`,
      'tip': `Tip to artist on Smashify`,
      'fan_subscription': `Monthly fan subscription on Smashify`,
      'listener_premium': `Smashify Premium Subscription`,
      'listener_family': `Smashify Family Subscription`,
      'artist_rising_star': `Smashify Rising Star Studio Tier`,
      'artist_standard': `Smashify Standard Studio Tier`,
      'artist_elite': `Smashify Elite Studio Tier`,
      'artist_ad_campaign': `Promotion campaign on Smashify`,
      'featured_placement': `Featured placement on Smashify`,
    }

    // 3. Create Pending Transaction
    const { error: txError } = await supabase.from('transactions').insert({
      artist_id: meta.artistId || null,
      fan_id: meta.userId || user.id,
      type: type.includes('subscription') ? 'subscription' : (type === 'tip' ? 'donation' : (type === 'track_purchase' ? 'sale' : 'other')),
      gross_amount: amount,
      status: 'pending',
      paychangu_ref: tx_ref,
      description: descriptions[type] || 'Smashify Payment',
      metadata: meta
    })

    if (txError) throw txError

    // 4. Initialize PayChangu Payment
    const response = await fetch('https://api.paychangu.com/payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: currency || 'MWK',
        email,
        first_name,
        last_name,
        tx_ref,
        callback_url,
        return_url: `${return_url}${tx_ref}`, // Append tx_ref for success page polling
        customization: {
          title: 'Smashify',
          description: descriptions[type] || 'Smashify Payment',
          logo: 'https://ais-pre-mqanea5thkwbq6cnhd3hxr-828774785557.europe-west2.run.app/logo.png', // Fallback to a logo
        }
      })
    })

    const payload = await response.json()

    if (!response.ok) {
        // Cleanup on failed initialization
        await supabase.from('transactions').delete().eq('paychangu_ref', tx_ref)
        throw new Error(payload.message || 'PayChangu initialization failed')
    }

    return new Response(JSON.stringify({ checkout_url: payload.data.checkout_url }), {
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
