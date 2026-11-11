import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://play-smashify.vercel.app",
  "https://smashifymusic.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(requestOrigin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
  }
  return headers;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const body = await req.json();
    const { amount: requestedAmount, email, first_name, last_name, type, tx_ref, meta, return_url, currency } = body;
    const paymentType = (type || '').toLowerCase();

    const CANONICAL_PRICES: Record<string, number> = {
      'listener_daily_pass': 150,
      'listener_weekly_pass': 700,
      'listener_premium': 2000,
      'listener_family': 5000,
      'artist_rising_star': 8000,
      'artist_standard': 16000,
      'artist_elite': 27000,
    };

    // 1. Authenticate User (Verified JWT)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Missing auth token");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: corsHeaders, status: 401 });

    const txFanId = user.id;
    let validatedAmount = Number(requestedAmount);
    let artistId = meta?.artistId || null;

    // 2. Validate Pricing & Snapshot (Server-Authoritative)
    if (paymentType === 'track_purchase') {
      const { data: song } = await supabase.from('songs').select('price, is_for_sale, artist_id, discount_percent, sale_ends_at').eq('id', meta.songId).single();
      if (!song?.is_for_sale) throw new Error('Track not for sale');
      const pct = song.discount_percent || 0;
      const saleActive = pct > 0 && (!song.sale_ends_at || new Date(song.sale_ends_at).getTime() > Date.now());
      validatedAmount = saleActive ? Math.max(Math.round(song.price * (1 - pct / 100)), 1) : song.price;
      artistId = song.artist_id;
    } else if (paymentType === 'album_purchase') {
      const { data: album } = await supabase.from('albums').select('id, price, is_for_sale, artist_id, discount_percent, sale_ends_at').eq('id', meta.albumId).single();
      if (!album?.is_for_sale) throw new Error('Album not for sale');
      
      // Mandatory Snapshot
      const { data: tracks } = await supabase.from('songs').select('id').eq('album_id', album.id);
      if (!tracks?.length) throw new Error('Cannot buy empty album');
      meta.trackIds = tracks.map(t => t.id);

      const pct = album.discount_percent || 0;
      const saleActive = pct > 0 && (!album.sale_ends_at || new Date(album.sale_ends_at).getTime() > Date.now());
      validatedAmount = saleActive ? Math.max(Math.round(album.price * (1 - pct / 100)), 1) : album.price;
      artistId = album.artist_id;
    } else if (CANONICAL_PRICES[paymentType]) {
      validatedAmount = CANONICAL_PRICES[paymentType];
      artistId = user.id;
    } else if (paymentType === 'tip') {
      validatedAmount = Math.max(Number(requestedAmount), 500); 
    } else if (paymentType === 'fan_subscription') {
      const { data: artProfile } = await supabase.from('profiles').select('subscription_price').eq('id', artistId).maybeSingle();
      validatedAmount = artProfile?.subscription_price || 1500;
    } else if (paymentType === 'artist_ad_campaign') {
      validatedAmount = Number(requestedAmount); 
    } else {
      throw new Error(`Invalid or unrecognized payment type: ${paymentType}`);
    }

    if (isNaN(validatedAmount) || validatedAmount <= 0) {
      throw new Error('Invalid payment amount');
    }

    // 3. Fee Logic (Consistent with server.ts)
    let dbType = 'other';
    if (paymentType.includes('listener_') || paymentType.includes('artist_') || paymentType.includes('subscription')) {
       dbType = (paymentType === 'artist_ad_campaign' || paymentType === 'featured_placement') ? 'promotion' : 'subscription';
    } else if (paymentType === 'tip') {
       dbType = 'donation';
    } else if (paymentType === 'track_purchase' || paymentType === 'album_purchase') {
       dbType = 'sale';
    }

    let platformFee = 0;
    if (paymentType.includes('listener_') || paymentType.includes('artist_') || paymentType === 'artist_ad_campaign') {
      platformFee = validatedAmount;
    } else if (paymentType === 'tip') {
      platformFee = Math.round(validatedAmount * 0.05); // 5% Tip fee
    } else if (paymentType === 'track_purchase' || paymentType === 'album_purchase') {
      platformFee = Math.round(validatedAmount * 0.20) + 50; // 20% + 50 MK
    } else if (paymentType === 'fan_subscription') {
      platformFee = Math.round(validatedAmount * 0.10); // 10% Sub fee
    }
    const netAmount = Math.max(validatedAmount - platformFee, 0);

    const resolvedReturnUrl = return_url.includes("?") ? `${return_url}&tx_ref=${tx_ref}` : `${return_url}?tx_ref=${tx_ref}`;

    // 4. Record Transaction
    const { error: txError } = await supabase.from("transactions").upsert({
      artist_id: artistId,
      fan_id: txFanId,
      type: dbType,
      gross_amount: validatedAmount,
      platform_fee: platformFee,
      net_amount: netAmount,
      status: "pending",
      paychangu_ref: tx_ref,
      return_url: resolvedReturnUrl,
      metadata: { ...meta, payment_type: paymentType, userId: txFanId },
    }, { onConflict: 'paychangu_ref' });

    if (txError) throw txError;

    // 5. Init PayChangu
    const descriptions: Record<string, string> = {
      'track_purchase': `Purchase of music track on Smashify`,
      'album_purchase': `Purchase of full music album on Smashify`,
      'tip': `Tip to artist on Smashify`,
      'fan_subscription': `Monthly fan subscription on Smashify`,
    };

    const pcRes = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: validatedAmount,
        currency: currency || "MWK",
        email,
        first_name,
        last_name,
        tx_ref,
        callback_url: `${SUPABASE_URL}/functions/v1/paychangu-webhook`,
        return_url: resolvedReturnUrl,
        customization: { 
          title: "Smashify", 
          description: descriptions[paymentType] || "Secure Payment",
          logo: "https://smashifymusic.vercel.app/logo.png" 
        },
      }),
    });

    const payload = await pcRes.json();
    if (!pcRes.ok) throw new Error(payload.message || "PayChangu init failed");
    
    return new Response(JSON.stringify({ checkout_url: payload.data.checkout_url }), { headers: corsHeaders, status: 200 });
  } catch (error: any) {
    console.error("Create Payment Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 400 });
  }
});
