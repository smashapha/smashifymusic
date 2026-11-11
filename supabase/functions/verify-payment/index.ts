import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
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
    let isForceGrant = false;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.tx_ref) tx_ref = body.tx_ref;
        if (body?.force_grant) isForceGrant = body.force_grant;
      } catch (_) {}
    }

    if (tx_ref && typeof tx_ref === "string") {
      tx_ref = tx_ref.trim().replace(/\/$/, "").replace(/^["']|["']$/g, "");
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
        JSON.stringify({ error: "Transaction not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Role Ownership check: Only fan, artist, or system admin can trigger this
    const isOwner = dbTx.fan_id === user.id || dbTx.artist_id === user.id;
    let isAdmin = user.email === 'smashtherealmuzic@gmail.com';
    
    if (!isAdmin) {
       const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
       const { data: up } = await supabase.from('user_profiles').select('is_admin').eq('id', user.id).maybeSingle();
       isAdmin = p?.is_admin || up?.is_admin;
    }

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access to verify this transaction" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If already completed, just return success
    if (dbTx.status === "completed") {
      return new Response(
        JSON.stringify({ status: 'completed', granted: true, transaction: dbTx }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let pcVerified = false;
    let pcAmount = dbTx.gross_amount;

    // Admin can force grant without PayChangu verification
    if (isForceGrant && isAdmin) {
       pcVerified = true;
    } else {
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
           pcVerified = true;
           pcAmount = payload.data.amount || dbTx.gross_amount;
         } else if (pcStatus === "failed") {
           await supabase.from("transactions").update({ status: "failed" }).eq("id", dbTx.id);
           dbTx.status = "failed";
         }
       }
    }

    if (pcVerified) {
       // Invoke atomic finalizer RPC
       const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_payment_order', {
          p_paychangu_ref: tx_ref,
          p_gateway_amount: pcAmount
       });

       if (rpcErr) {
          console.error("RPC Error during verification:", rpcErr);
          throw new Error(rpcErr.message);
       }

       const { data: updated } = await supabase.from('transactions').select('*').eq('id', dbTx.id).single();
       return new Response(
         JSON.stringify({ status: 'completed', granted: true, transaction: updated || dbTx, rpc: rpcRes }),
         {
           status: 200,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         },
       );
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
