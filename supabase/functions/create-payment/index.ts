import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://play-smashify.vercel.app",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req) => {
  console.log("Payment Function: Request received", req.method);
  const corsHeaders = getCorsHeaders(req);

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
    const canonicalAmount = CANONICAL_PRICES[type?.toUpperCase()];
    const finalAmount = canonicalAmount ?? Number(amount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payment amount" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (type === "tip") {
      if (finalAmount < 100 || finalAmount > 50000) {
        return new Response(
          JSON.stringify({
            error: "Tip amount must be between 100 and 50,000 MWK",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    } else if (type === "track_purchase") {
      if (finalAmount < 50 || finalAmount > 10000) {
        return new Response(
          JSON.stringify({
            error: "Track purchase amount must be between 50 and 10,000 MWK",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    }
    console.log("Payment Function: Initiating:", {
      type,
      tx_ref,
      amount: finalAmount,
    });

    // 1. Verify Authentication
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

    // Rate limiting: max 3 payment initiations per user per 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("fan_id", user.id)
      .eq("status", "pending")
      .gte("created_at", oneMinuteAgo);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({
          error:
            "Too many payment attempts. Please wait a moment before trying again.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Map Payment Description
    const descriptions: Record<string, string> = {
      track_purchase: `Purchase of music track on Smashify`,
      tip: `Tip to artist on Smashify`,
      fan_subscription: `Monthly fan subscription on Smashify`,
      listener_daily_pass: `Smashify Premium Daily Pass`,
      listener_weekly_pass: `Smashify Premium Weekly Pass`,
      listener_premium: `Smashify Premium Subscription`,
      listener_family: `Smashify Family Subscription`,
      artist_rising_star: `Smashify Rising Star Studio Tier`,
      artist_standard: `Smashify Standard Studio Tier`,
      artist_elite: `Smashify Elite Studio Tier`,
      artist_ad_campaign: `Promotion campaign on Smashify`,
      featured_placement: `Featured placement on Smashify`,
    };

    // 3. Create Pending Transaction
    console.log("Payment Function: Creating transaction in DB...");

    const typeLower = type.toLowerCase();
    let dbType = 'other';
    if (typeLower === 'track_purchase') dbType = 'sale';
    else if (typeLower === 'tip') dbType = 'donation';
    else if (typeLower.includes('subscription') || typeLower.startsWith('listener_') || typeLower.startsWith('artist_')) {
      dbType = 'subscription';
    }
    if (typeLower === 'artist_ad_campaign' || typeLower === 'featured_placement') {
      dbType = 'promotion';
    }

    // Fee calculation — different rules for tips, sales, and platform-pure payment types
    const platformPures = [
      "LISTENER_DAILY_PASS",
      "LISTENER_WEEKLY_PASS",
      "LISTENER_PREMIUM",
      "LISTENER_FAMILY",
      "ARTIST_RISING_STAR",
      "ARTIST_STANDARD",
      "ARTIST_ELITE",
      "ARTIST_AD_CAMPAIGN",
      "FEATURED_PLACEMENT",
    ];

    let platformFee = 0;
    let netAmount = finalAmount;

    if (platformPures.includes(type.toUpperCase())) {
      // 100% goes to platform — these are subscription/promo payments, not artist earnings
      platformFee = finalAmount;
      netAmount = 0;
    } else if (typeLower === "tip") {
      // Flat 5% on tips, every tier, no exceptions
      const TIP_FEE_RATE = 0.05;
      platformFee = Math.round(finalAmount * TIP_FEE_RATE);
      netAmount = finalAmount - platformFee;
    } else if (typeLower === "track_purchase") {
      // Tiered commission + flat MK 50 fee — Elite/Label only, but apply rate based on tier regardless as a safety net
      const SALE_FEE_RATES: Record<string, number> = {
        Free: 0.20, free: 0.20,
        RisingStar: 0.20, risingstar: 0.20,
        Standard: 0.20, standard: 0.20,
        Elite: 0.10, elite: 0.10,
        Label: 0.05, label: 0.05,
      };
      const SALE_FLAT_FEE = 50;

      let tierRate = 0.20;
      if (meta.artistId) {
        const { data: artistProfile } = await supabase
          .from("profiles")
          .select("artist_tier")
          .eq("id", meta.artistId)
          .single();
        tierRate = SALE_FEE_RATES[artistProfile?.artist_tier || "Standard"] ?? 0.20;
      }
      const percentageFee = Math.round(finalAmount * tierRate);
      platformFee = percentageFee + SALE_FLAT_FEE;
      netAmount = Math.max(finalAmount - platformFee, 0);
    } else if (typeLower.includes("subscription") || typeLower === "fan_subscription") {
      // Fan subscriptions — 10% Smashify fee, rest to artist
      const SUB_FEE_RATE = 0.10;
      platformFee = Math.round(finalAmount * SUB_FEE_RATE);
      netAmount = finalAmount - platformFee;
    } else {
      // Fallback — should rarely hit, default to 15% to be safe
      platformFee = Math.round(finalAmount * 0.15);
      netAmount = finalAmount - platformFee;
    }

    if (typeLower === "track_purchase" && meta.artistId) {
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("artist_tier")
        .eq("id", meta.artistId)
        .single();
    
      const eligibleTiers = ["Elite", "elite", "Label", "label"];
      if (!sellerProfile || !eligibleTiers.includes(sellerProfile.artist_tier)) {
        return new Response(
          JSON.stringify({ error: "This artist's plan does not support track sales. Only Elite and Label tier artists can sell tracks." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    const txFanId = meta.userId || user.id;

    const { error: txError } = await supabase.from("transactions").insert({
      artist_id: meta.artistId || null,
      fan_id: txFanId,
      type: dbType,
      gross_amount: finalAmount,
      status: "pending",
      paychangu_ref: tx_ref,
      description: descriptions[type] || "Smashify Payment",
      metadata: { ...meta, payment_type: type },
      platform_fee: platformFee,
      net_amount: netAmount,
    });

    if (txError) {
      console.error("Payment Function: DB Insert Error:", txError);
      throw txError;
    }

    // 4. Initialize PayChangu Payment
    console.log("Payment Function: Calling PayChangu API...");
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
        return_url: return_url.includes("?") 
            ? `${return_url}&tx_ref=${tx_ref}`
            : `${return_url}?tx_ref=${tx_ref}`,
        customization: {
          title: "Smashify",
          description: descriptions[type] || "Smashify Payment",
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error("Payment Function: PayChangu Error:", payload);
      // Cleanup on failed initialization
      await supabase.from("transactions").delete().eq("paychangu_ref", tx_ref);
      throw new Error(payload.message || "PayChangu initialization failed");
    }

    console.log("Payment Function: Success, returning checkout URL");
    return new Response(
      JSON.stringify({ checkout_url: payload.data.checkout_url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Payment Function Global Error:", error);
    const errorMessage = error instanceof Error 
       ? error.message 
       : typeof error === 'object' && error !== null 
          ? JSON.stringify(error) 
          : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
