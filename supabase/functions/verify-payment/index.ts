import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Auth Check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    let tx_ref = url.searchParams.get("tx_ref");
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.tx_ref) tx_ref = body.tx_ref;
      } catch (_) {}
    }

    if (!tx_ref) {
      return new Response(JSON.stringify({ error: "Missing tx_ref" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Verifying payment for: ${tx_ref}`);

    // Check DB First
    const { data: dbTx, error: dbError } = await supabase
      .from("transactions")
      .select("*")
      .eq("paychangu_ref", tx_ref)
      .single();

    if (dbError || !dbTx) {
      return new Response(
        JSON.stringify({ error: "Transaction not found in our database" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Role Ownership check: Only user, artist, or system admin can trigger this
    if (dbTx.fan_id !== user.id && dbTx.artist_id !== user.id) {
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      const { data: adminUserProfile } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = adminProfile?.is_admin === true || adminUserProfile?.is_admin === true;

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Unauthorized access to verify this transaction" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (dbTx.status === "completed" || dbTx.status === "failed") {
      return new Response(
        JSON.stringify({ status: dbTx.status, transaction: dbTx }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Fetch from PayChangu API
    const response = await fetch(
      `https://api.paychangu.com/verify-payment/${tx_ref}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
          Accept: "application/json",
        },
      },
    );

    const payload = await response.json();
    console.log("PayChangu verification response:", payload);

    if (response.ok && payload.status === "success" && payload.data) {
      const pcStatus = payload.data.status;
      if (pcStatus === "successful" || pcStatus === "success") {
        // Trigger the exact same logic as webhook! But just to be DRY, we can just fetch the webhook URL (or we can duplicate the logic here since we have it).
        // To be simpler, we can just POST the payload.data to our own webhook.
        try {
          const eventData = payload.data;
          const { amount } = eventData;
          const type = (dbTx.metadata?.payment_type || "").toUpperCase();
          const { artistId, songId, plan, tier, plays, anonymous } =
            dbTx.metadata || {};
          const userId = dbTx.metadata?.userId || dbTx.fan_id;
          const grossAmount = Number(dbTx.gross_amount);
          const netAmount = Number(dbTx.net_amount);

          const { data: updatedTxs, error: updateError } = await supabase
            .from("transactions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", dbTx.id)
            .eq("status", "pending")
            .select();

          if (updateError || !updatedTxs || updatedTxs.length === 0) {
            console.log(
              `Transaction ${dbTx.id} already processed or no longer pending`,
            );
            dbTx.status = "completed";
            return new Response(
              JSON.stringify({ status: dbTx.status, transaction: dbTx }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          console.log(`Processing ${type} for user ${userId}`);

          // Process logic...
          switch (type) {
            case "TRACK_PURCHASE":
              const { error: fpError } = await supabase
                .from("fan_purchases")
                .upsert(
                  {
                    fan_id: userId,
                    song_id: songId,
                    transaction_id: dbTx.id,
                    amount: grossAmount,
                    status: "completed",
                  },
                  { onConflict: "fan_id,song_id" },
                );
              if (fpError)
                console.error(
                  "fan_purchases upsert failed:",
                  fpError.message,
                  fpError.details,
                );

              await supabase.rpc("increment_wallet", {
                artist_id: artistId,
                amount: netAmount,
              });

              // Increment sales count safely
              const { data: songData } = await supabase
                .from("songs")
                .select("sales")
                .eq("id", songId)
                .single();
              const currentSales = Number(songData?.sales || 0);
              await supabase
                .from("songs")
                .update({ sales: currentSales + 1 })
                .eq("id", songId);
              break;

            case "TIP": {
              await supabase.rpc("increment_wallet", {
                artist_id: artistId,
                amount: netAmount,
              });

              if (!anonymous) {
                await supabase.from("notifications").insert({
                  profile_id: artistId,
                  user_type: "artist",
                  type: "tip_received",
                  message: `You received a MWK ${grossAmount.toLocaleString()} tip! (Net: MWK ${netAmount.toLocaleString()}) 💸`,
                  link: "/artist-hub#dashboard",
                });
              }
              break;
            }
            case "FAN_SUBSCRIPTION": {
              const renewsAt = new Date();
              renewsAt.setDate(renewsAt.getDate() + 30);
              await supabase.from("fan_subscriptions").upsert({
                fan_id: userId,
                artist_id: artistId,
                status: "active",
                next_billing_at: renewsAt.toISOString(),
              });

              await supabase.rpc("increment_wallet", {
                artist_id: artistId,
                amount: netAmount,
              });

              await supabase.from("notifications").insert({
                profile_id: artistId,
                user_type: "artist",
                type: "subscription_started",
                message: `A fan just started a monthly subscription! MWK ${grossAmount.toLocaleString()} 💖 (Net: MWK ${netAmount.toLocaleString()})`,
                link: "/artist-hub#fans",
              });
              break;
            }
            case "LISTENER_PREMIUM":
            case "LISTENER_FAMILY":
              const subEnds = new Date();
              subEnds.setDate(subEnds.getDate() + 30);
              const subTierName =
                type === "LISTENER_PREMIUM" ? "Premium" : "Family";
              await supabase.from("user_profiles").upsert(
                {
                  id: userId,
                  subscription_tier: subTierName,
                  subscription_ends: subEnds.toISOString(),
                },
                { onConflict: "id" },
              );
              break;
            case "ARTIST_RISING_STAR":
            case "ARTIST_STANDARD":
            case "ARTIST_ELITE":
              const artistTierEnds = new Date();
              artistTierEnds.setMonth(artistTierEnds.getMonth() + 6);
              const tierMap: Record<string, string> = {
                ARTIST_RISING_STAR: "RisingStar",
                ARTIST_STANDARD: "Standard",
                ARTIST_ELITE: "Elite",
              };
              const artistTierName = tierMap[type] || "Free";
              await supabase
                .from("profiles")
                .update({
                  subscription_tier: artistTierName,
                  artist_tier: artistTierName,
                  subscription_ends: artistTierEnds.toISOString(),
                  approved: true,
                })
                .eq("id", userId);
              await supabase.from("user_profiles").upsert(
                {
                  id: userId,
                  subscription_tier: "Premium",
                  subscription_ends: artistTierEnds.toISOString(),
                },
                { onConflict: "id" },
              );
              break;
            case "ARTIST_AD_CAMPAIGN":
              await supabase.from("audio_ads").insert({
                artist_id: userId,
                type: "promo",
                plays_purchased: plays,
                active: false,
              });
              break;
          }

          dbTx.status = "completed";
        } catch (e) {
          console.error("Inline processing error", e);
        }
      } else if (pcStatus === "failed") {
        const { data: failedTxs } = await supabase
          .from("transactions")
          .update({ status: "failed" })
          .eq("id", dbTx.id)
          .eq("status", "pending")
          .select();

        dbTx.status = "failed";
      }
    }

    return new Response(
      JSON.stringify({ status: dbTx.status, transaction: dbTx }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
