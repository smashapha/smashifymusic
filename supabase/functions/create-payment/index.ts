import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log("Payment Function: Request received", req.method)

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
    
    const body = await req.json()
    const { amount, email, first_name, last_name, type, tx_ref, meta, return_url, currency } = body
    console.log("Payment Function: Initiating:", { type, tx_ref, amount })

    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error("Payment Function: Missing Authorization header")
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error("Payment Function: Auth error:", authError)
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
    console.log("Payment Function: Creating transaction in DB...")
    const { error: txError } = await supabase.from('transactions').insert({
      artist_id: meta.artistId || null,
      fan_id: meta.userId || user.id,
      type: type.includes('subscription') ? 'subscription' : (type === 'tip' ? 'donation' : (type === 'track_purchase' ? 'sale' : 'other')),
      gross_amount: amount,
      status: 'pending',
      paychangu_ref: tx_ref,
      description: descriptions[type] || 'Smashify Payment',
      metadata: meta,
      net_amount: amount * 0.9 // Default net
    })

    if (txError) {
      console.error("Payment Function: DB Insert Error:", txError)
      throw txError
    }

    // 4. Initialize PayChangu Payment
    console.log("Payment Function: Calling PayChangu API...")
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
        callback_url: `${return_url}${tx_ref}`,
        return_url: `${return_url}${tx_ref}`,
        customization: {
          title: 'Smashify',
          description: descriptions[type] || 'Smashify Payment',
          logo: 'https://ais-pre-mqanea5thkwbq6cnhd3hxr-828774785557.europe-west2.run.app/logo.png',
        }
      })
    })

    const payload = await response.json()

    if (!response.ok) {
        console.error("Payment Function: PayChangu Error:", payload)
        // Cleanup on failed initialization
        await supabase.from('transactions').delete().eq('paychangu_ref', tx_ref)
        throw new Error(payload.message || 'PayChangu initialization failed')
    }

    console.log("Payment Function: Success, returning checkout URL")
    return new Response(JSON.stringify({ checkout_url: payload.data.checkout_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Payment Function Global Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
