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
    // Fallback but browsers might block if credentials are sent
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
       // If not found in DB, we could try live lookup here, but let's assume it should exist
       return new Response(JSON.stringify({ error: "Transaction not found" }), {
         status: 404,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    // --- Authorization Check ---
    const isOwner = dbTx.fan_id === user.id || dbTx.artist_id === user.id || dbTx.metadata?.userId === user.id;
    let isAdmin = user.email === 'smashtherealmuzic@gmail.com';
    if (!isAdmin) {
       const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
       isAdmin = !!p?.is_admin;
    }

    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized access to this transaction" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Entitlement Check (Self-Healing) ---
    const isSongPurchase = (dbTx.metadata?.songId && (dbTx.type === 'sale' || dbTx.metadata?.payment_type === 'track_purchase'));
    const isAlbumPurchase = (dbTx.metadata?.albumId && (dbTx.type === 'sale' || dbTx.metadata?.payment_type === 'album_purchase'));

    if (dbTx.status === 'completed') {
       let needsFulfillment = false;
       
       if (isSongPurchase) {
          const { data: purchase } = await supabase.from('fan_purchases').select('id').eq('fan_id', user.id).eq('song_id', dbTx.metadata.songId).maybeSingle();
          if (!purchase) needsFulfillment = true;
       } else if (isAlbumPurchase) {
          // Check if at least one track is purchased (simple check)
          const trackIds = dbTx.metadata.trackIds || [];
          if (trackIds.length > 0) {
             const { data: purchase } = await supabase.from('fan_purchases').select('id').eq('fan_id', user.id).eq('song_id', trackIds[0]).maybeSingle();
             if (!purchase) needsFulfillment = true;
          } else {
             needsFulfillment = true;
          }
       }

       if (needsFulfillment) {
          console.log(`Self-healing fulfillment for completed tx: ${tx_ref}`);
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

    // 2. Fetch from PayChangu API (Pending Transaction)
    const pcRes = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
        Accept: "application/json",
      },
    });

    const payload = await pcRes.json();
    console.log("PayChangu verify response:", payload);

    if (pcRes.ok && payload.status === "success" && payload.data) {
      const pcStatus = (payload.data.status || "").toLowerCase();
      if (pcStatus === "successful" || pcStatus === "success" || pcStatus === "paid") {
         // Invoke the atomic fulfillment RPC
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
