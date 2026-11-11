import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  console.log("Payment Function: Request received", req.method);
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!PAYCHANGU_SECRET_KEY)
      throw new Error("PAYCHANGU_SECRET_KEY is missing in Secrets");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is missing in Secrets");
    if (!SUPABASE_SERVICE_ROLE_KEY)
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in Secrets");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const {
      amount,
      email,
      first_name,
      last_name,
      type,
      tx_ref,
      meta,
      return_url,
      currency,
    } = body;

    const CANONICAL_PRICES: Record<string, number> = {
      LISTENER_DAILY_PASS: 150,
      LISTENER_WEEKLY_PASS: 700,
      LISTENER_PREMIUM: 2000,
      LISTENER_FAMILY: 5000,
      ARTIST_RISING_STAR: 8000,
      ARTIST_STANDARD: 16000,
      ARTIST_ELITE: 27000,
    };

    const descriptions: Record<string, string> = {
      'track_purchase': `Purchase of music track on Smashify`,
      'album_purchase': `Purchase of full music album on Smashify`,
      'tip': `Tip to artist on Smashify`,
      'fan_subscription': `Monthly fan subscription on Smashify`,
      'listener_daily_pass': `Smashify Premium Daily Pass`,
      'listener_weekly_pass': `Smashify Premium Weekly Pass`,
      'listener_premium': `Smashify Premium Subscription`,
      'listener_family': `Smashify Family Subscription`,
      'artist_rising_star': `Smashify Rising Star Studio Tier`,
      'artist_standard': `Smashify Standard Studio Tier`,
      'artist_elite': `Smashify Elite Studio Tier`,
      'artist_ad_campaign': `Promotion campaign on Smashify`,
      'featured_placement': `Featured placement on Smashify`,
    };

    // 1. Verify Authentication (Enforced)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Payment Function: Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Payment Function: Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // IDENTITY HARDENING: Always use verified user ID from JWT
    const txFanId = user.id;
    let finalAmount: number;
    let artistId = meta?.artistId || null;

    if (type === 'track_purchase') {
      if (!meta?.songId) {
        return new Response(JSON.stringify({ error: 'Missing songId for track purchase' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const { data: songRow, error: songError } = await supabase
        .from('songs')
        .select('price, is_for_sale, artist_id, discount_percent, sale_ends_at')
        .eq('id', meta.songId)
        .single();

      if (songError || !songRow || !songRow.is_for_sale) {
        return new Response(JSON.stringify({ error: 'This track is not available for purchase' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const pct = songRow.discount_percent || 0;
      const saleExpired = songRow.sale_ends_at && new Date(songRow.sale_ends_at).getTime() < Date.now();
      finalAmount = (pct > 0 && !saleExpired)
        ? Math.max(Math.round(songRow.price * (1 - pct / 100)), 1)
        : songRow.price;

      artistId = songRow.artist_id;
    } else if (type === 'album_purchase') {
      if (!meta?.albumId) {
        return new Response(JSON.stringify({ error: 'Missing albumId for album purchase' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const { data: albumRow, error: albumErr } = await supabase
        .from('albums')
        .select('price, is_for_sale, artist_id, discount_percent, sale_ends_at')
        .eq('id', meta.albumId)
        .single();

      if (albumErr || !albumRow || !albumRow.is_for_sale) {
        return new Response(JSON.stringify({ error: 'This album is not available for purchase or does not exist' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const basePrice = Number(albumRow.price || 0);
      if (basePrice <= 0) {
        return new Response(JSON.stringify({ error: 'This album does not have a valid price set' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const pct = albumRow.discount_percent || 0;
      const saleExpired = albumRow.sale_ends_at && new Date(albumRow.sale_ends_at).getTime() < Date.now();
      finalAmount = (pct > 0 && !saleExpired)
        ? Math.max(Math.round(basePrice * (1 - pct / 100)), 1)
        : basePrice;

      artistId = albumRow.artist_id;
    } else if (type === 'fan_subscription') {
      if (!artistId) {
        return new Response(JSON.stringify({ error: 'Missing artistId for fan subscription' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      const { data: artistProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('subscription_price')
        .eq('id', artistId)
        .single();
      if (profileErr || !artistProfile) {
        return new Response(JSON.stringify({ error: 'Artist not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      finalAmount = artistProfile.subscription_price || 1500;
    } else {
      const canonicalAmount = CANONICAL_PRICES[type?.toUpperCase()];
      finalAmount = canonicalAmount ?? Number(amount);
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid payment amount' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Determine dbType for accounting
    let dbType = 'other';
    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('listener_') || normalizedType.includes('artist_') || normalizedType.includes('subscription')) {
      dbType = (normalizedType === 'artist_ad_campaign' || normalizedType === 'featured_placement') ? 'promotion' : 'subscription';
    } else if (normalizedType === 'tip') {
      dbType = 'donation';
    } else if (normalizedType === 'track_purchase' || normalizedType === 'album_purchase') {
      dbType = 'sale';
    }

    // Calculate Platform Fees & Net Amount
    let platformFee = 0;
    let netAmount = finalAmount;

    if (dbType === 'subscription' || dbType === 'promotion') {
      platformFee = finalAmount;
      netAmount = 0;
    } else if (normalizedType === 'tip') {
      platformFee = Math.round(finalAmount * 0.05);
      netAmount = finalAmount - platformFee;
    } else if (normalizedType === 'fan_subscription') {
      platformFee = Math.round(finalAmount * 0.10);
      netAmount = finalAmount - platformFee;
    } else if (dbType === 'sale') {
      // Tiered commission rates: Elite 10%, Label 5%, others 20%
      let commissionRate = 0.20;
      if (artistId) {
        const { data: artistProfile } = await supabase
          .from('profiles')
          .select('artist_tier, subscription_tier')
          .eq('id', artistId)
          .maybeSingle();
        
        const tier = (artistProfile?.artist_tier || artistProfile?.subscription_tier || 'free').toLowerCase();
        if (tier === 'elite') commissionRate = 0.10;
        else if (tier === 'label') commissionRate = 0.05;
      }
      
      platformFee = Math.round(finalAmount * commissionRate) + 50; // +50 for mobile money fixed fee
      netAmount = Math.max(finalAmount - platformFee, 0);
    }

    // 3. Create Transaction Record
    const { error: txError } = await supabase.from("transactions").insert({
      artist_id: artistId,
      fan_id: txFanId,
      type: dbType,
      gross_amount: finalAmount,
      platform_fee: platformFee,
      net_amount: netAmount,
      status: "pending",
      paychangu_ref: tx_ref,
      description: descriptions[type] || "Smashify Payment",
      metadata: { ...meta, payment_type: type, userId: txFanId },
    });

    if (txError) {
      console.error("Payment Function: DB Insert Error:", txError);
      throw txError;
    }

    // 4. Initialize PayChangu Payment
    const response = await fetch("https://api.paychangu.com/payment", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: finalAmount,
        currency: currency || "MWK",
        email,
        first_name,
        last_name,
        tx_ref,
        callback_url: `${SUPABASE_URL}/functions/v1/paychangu-webhook`,
        return_url: return_url.includes("?") 
            ? `${return_url}&tx_ref=${tx_ref}`
            : `${return_url}?tx_ref=${tx_ref}`,
        customization: {
          title: "Smashify",
          description: descriptions[type] || "Smashify Payment",
          logo: "https://smashifymusic.vercel.app/logo.png",
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error("Payment Function: PayChangu Error:", payload);
      await supabase
        .from("transactions")
        .update({ status: "failed", metadata: { ...meta, payment_type: type, failure_reason: "paychangu_init_failed", paychangu_error: payload.message || "Unknown error" } })
        .eq("paychangu_ref", tx_ref);
      throw new Error(payload.message || "PayChangu initialization failed");
    }

    return new Response(
      JSON.stringify({ checkout_url: payload.data.checkout_url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Payment Function Global Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
