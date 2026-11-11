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
    const { amount, email, first_name, last_name, type, tx_ref, meta, return_url, currency } = body;

    const CANONICAL_PRICES: Record<string, number> = {
      LISTENER_DAILY_PASS: 150,
      LISTENER_WEEKLY_PASS: 700,
      LISTENER_PREMIUM: 2000,
      LISTENER_FAMILY: 5000,
      ARTIST_RisingStar: 8000,
      ARTIST_Standard: 16000,
      ARTIST_Elite: 27000,
    };

    // 1. Authenticate User (Verified JWT)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Missing auth token");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: corsHeaders, status: 401 });

    const txFanId = user.id;
    let finalAmount: number;
    let artistId = meta?.artistId || null;

    // 2. Validate Pricing & Snapshot (Server-Authoritative)
    if (type === 'track_purchase') {
      const { data: song } = await supabase.from('songs').select('price, is_for_sale, artist_id, discount_percent, sale_ends_at').eq('id', meta.songId).single();
      if (!song?.is_for_sale) throw new Error('Track not for sale');
      const pct = song.discount_percent || 0;
      const saleActive = pct > 0 && (!song.sale_ends_at || new Date(song.sale_ends_at).getTime() > Date.now());
      finalAmount = saleActive ? Math.max(Math.round(song.price * (1 - pct / 100)), 1) : song.price;
      artistId = song.artist_id;
    } else if (type === 'album_purchase') {
      const { data: album } = await supabase.from('albums').select('id, price, is_for_sale, artist_id, discount_percent, sale_ends_at').eq('id', meta.albumId).single();
      if (!album?.is_for_sale) throw new Error('Album not for sale');
      
      // Mandatory Snapshot
      const { data: tracks } = await supabase.from('songs').select('id').eq('album_id', album.id);
      if (!tracks?.length) throw new Error('Cannot buy empty album');
      meta.trackIds = tracks.map(t => t.id);

      const pct = album.discount_percent || 0;
      const saleActive = pct > 0 && (!album.sale_ends_at || new Date(album.sale_ends_at).getTime() > Date.now());
      finalAmount = saleActive ? Math.max(Math.round(album.price * (1 - pct / 100)), 1) : (album.price || 2500);
      artistId = album.artist_id;
    } else if (CANONICAL_PRICES[type]) {
      finalAmount = CANONICAL_PRICES[type];
    } else if (type === 'tip') {
      finalAmount = Math.max(Number(amount), 500); 
    } else if (type === 'fan_subscription') {
        const { data: artProfile } = await supabase.from('profiles').select('subscription_price').eq('id', artistId).maybeSingle();
        finalAmount = artProfile?.subscription_price || 1500;
    } else if (type === 'artist_ad_campaign') {
        finalAmount = Number(amount); // Ad campaigns have variable pricing
    } else {
      throw new Error(`Invalid or unrecognized payment type: ${type}`);
    }

    // 3. Fee Logic
    let dbType = 'other';
    if (type.includes('listener_') || type.includes('RisingStar') || type.includes('Standard') || type.includes('Elite') || type.includes('subscription')) dbType = 'subscription';
    else if (type === 'tip') dbType = 'donation';
    else if (type.includes('purchase')) dbType = 'sale';
    else if (type === 'artist_ad_campaign') dbType = 'promotion';

    let commissionRate = 0.20;
    if (dbType === 'sale' && artistId) {
      const { data: art } = await supabase.from('profiles').select('artist_tier').eq('id', artistId).maybeSingle();
      if (art?.artist_tier?.toLowerCase() === 'elite') commissionRate = 0.10;
    }
    const platformFee = (dbType === 'sale' || dbType === 'donation') ? Math.round(finalAmount * commissionRate) : 0;
    const netAmount = Math.max(finalAmount - platformFee, 0);

    const resolvedReturnUrl = return_url.includes("?") ? `${return_url}&tx_ref=${tx_ref}` : `${return_url}?tx_ref=${tx_ref}`;

    // 4. Record Transaction
    await supabase.from("transactions").insert({
      artist_id: artistId, fan_id: txFanId, type: dbType, gross_amount: finalAmount,
      platform_fee: platformFee, net_amount: netAmount, status: "pending",
      paychangu_ref: tx_ref, return_url: resolvedReturnUrl,
      metadata: { ...meta, payment_type: type, userId: txFanId },
    });

    // 5. Init PayChangu
    const pcRes = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: finalAmount, currency: currency || "MWK", email, first_name, last_name, tx_ref,
        callback_url: `${SUPABASE_URL}/functions/v1/paychangu-webhook`,
        return_url: resolvedReturnUrl,
        customization: { title: "Smashify", description: "Secure Payment", logo: "https://smashifymusic.vercel.app/logo.png" },
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
