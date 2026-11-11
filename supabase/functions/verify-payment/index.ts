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
    "Access-Control-Allow-Credentials": "true",
  };
  
  if (requestOrigin && (ALLOWED_ORIGINS.includes(requestOrigin) || requestOrigin.endsWith(".vercel.app") || requestOrigin.endsWith(".run.app"))) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
  } else {
    headers["Access-Control-Allow-Origin"] = requestOrigin || "*";
  }
  return headers;
}

const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const body = await req.json();
    let tx_ref = body.tx_ref;
    const force_grant = body.force_grant === true;

    if (tx_ref && typeof tx_ref === "string") {
      tx_ref = tx_ref.trim().replace(/\/$/, "").replace(/^["']|["']$/g, "");
    }

    if (!tx_ref) {
       return new Response(JSON.stringify({ error: "Missing transaction reference" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    // 1. Fetch transaction from DB
    const { data: dbTx, error: dbError } = await supabase
      .from("transactions")
      .select("*")
      .or(`paychangu_ref.eq.${tx_ref},reference.eq.${tx_ref}`)
      .maybeSingle();

    if (dbError) {
       return new Response(JSON.stringify({ error: "Database error querying transaction" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    if (!dbTx) {
       return new Response(JSON.stringify({ error: "Transaction not found" }), {
         status: 404,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    // --- Authorization Check (Robust Admin & Owner detection) ---
    const userEmail = user.email?.toLowerCase();
    const isAdminHardcoded = userEmail === 'smashtherealmuzic@gmail.com';
    const isAdminMetadata = (user.app_metadata?.role === 'admin') || (user.user_metadata?.is_admin === true);
    
    let isAdminDB = false;
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (profile?.is_admin) isAdminDB = true;
    else {
      const { data: uprofile } = await supabase.from('user_profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (uprofile?.is_admin) isAdminDB = true;
    }

    const isAdmin = isAdminHardcoded || isAdminMetadata || isAdminDB;
    const isOwner = dbTx.fan_id === user.id || dbTx.artist_id === user.id || dbTx.metadata?.userId === user.id || dbTx.user_id === user.id;

    if (!isOwner && !isAdmin) {
      console.warn(`Access denied to transaction ${tx_ref} for user ${user.id} (${userEmail})`);
      return new Response(JSON.stringify({ error: "Unauthorized access to this transaction" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Fulfillment logic (Admin Override or Verified Settlement) ---
    const meta = dbTx.metadata || {};
    const payerId = meta.userId || dbTx.fan_id || dbTx.user_id;
    const isSongPurchase = meta.songId && (dbTx.type === 'sale' || meta.payment_type === 'track_purchase');
    const isAlbumPurchase = meta.albumId && (dbTx.type === 'sale' || meta.payment_type === 'album_purchase');

    // Case A: Manual Force Grant (Admin Only)
    if (force_grant && isAdmin) {
      console.log(`Force grant initiated by admin ${user.id} for tx ${tx_ref}`);
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_payment_order', {
         p_paychangu_ref: tx_ref,
         p_gateway_amount: dbTx.gross_amount,
         p_force_repair: true
      });
      if (rpcErr) throw new Error(`RPC Failed: ${rpcErr.message}`);
      const { data: updated } = await supabase.from('transactions').select('*').eq('paychangu_ref', tx_ref).single();
      return new Response(JSON.stringify({ status: 'completed', granted: true, transaction: updated }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Case B: Already completed (Self-healing if missing access)
    if (dbTx.status === 'completed') {
       let needsFulfillment = false;
       if (isSongPurchase && payerId) {
          const { data: purchase } = await supabase.from('fan_purchases').select('id').eq('fan_id', payerId).eq('song_id', meta.songId).maybeSingle();
          if (!purchase) needsFulfillment = true;
       } else if (isAlbumPurchase && payerId) {
          const trackIds = meta.trackIds || [];
          if (trackIds.length > 0) {
             const { data: purchase } = await supabase.from('fan_purchases').select('id').eq('fan_id', payerId).eq('song_id', trackIds[0]).maybeSingle();
             if (!purchase) needsFulfillment = true;
          } else {
             needsFulfillment = true;
          }
       }

       if (needsFulfillment) {
          console.log(`Self-healing missing access for completed tx: ${tx_ref}`);
          await supabase.rpc('finalize_payment_order', {
             p_paychangu_ref: tx_ref,
             p_gateway_amount: dbTx.gross_amount,
             p_force_repair: true
          });
       }

       return new Response(JSON.stringify({ status: 'completed', granted: true, transaction: dbTx }), {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    // Case C: Pending (Fetch from PayChangu API)
    const pcRes = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
        Accept: "application/json",
      },
    });

    const payload = await pcRes.json();
    if (pcRes.ok && payload.status === "success" && payload.data) {
      const pcStatus = (payload.data.status || "").toLowerCase();
      if (pcStatus === "successful" || pcStatus === "success" || pcStatus === "paid") {
         const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_payment_order', {
            p_paychangu_ref: tx_ref,
            p_gateway_amount: Number(payload.data.amount)
         });

         if (rpcErr) throw new Error(`Fulfillment RPC Failed: ${rpcErr.message}`);
         if (!rpcRes?.success) throw new Error(`Fulfillment Logic Failed: ${rpcRes?.error}`);

         const { data: updated } = await supabase.from('transactions').select('*').eq('paychangu_ref', tx_ref).single();
         return new Response(JSON.stringify({ status: 'completed', granted: true, transaction: updated }), {
           status: 200,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      } else if (["failed", "cancelled", "expired"].includes(pcStatus)) {
         await supabase.from("transactions").update({ status: "failed" }).eq("paychangu_ref", tx_ref);
         return new Response(JSON.stringify({ status: 'failed', transaction: { ...dbTx, status: 'failed' } }), {
           status: 200,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
    }

    return new Response(JSON.stringify({ status: dbTx?.status || 'pending', transaction: dbTx }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
