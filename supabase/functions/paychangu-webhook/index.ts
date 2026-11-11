import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

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

const PAYCHANGU_WEBHOOK_SECRET = Deno.env.get("PAYCHANGU_WEBHOOK_SECRET") || Deno.env.get("PAYCHANGU_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // CRITICAL: Always use privileged service client for fulfillment
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const url = new URL(req.url);

    // Handle browser redirects (GET requests)
    if (req.method === "GET") {
      const tx_ref = url.searchParams.get("tx_ref") || url.searchParams.get("reference");
      const defaultRedirect = "https://smashifymusic.vercel.app";

      if (tx_ref) {
        // Fetch transaction to know where to redirect based on original return_url
        const { data: transaction } = await supabase
          .from("transactions")
          .select("metadata, return_url")
          .eq("paychangu_ref", tx_ref)
          .maybeSingle();

        const type = (transaction?.metadata?.payment_type || "").toUpperCase();
        let redirectPath = "/";

        if (transaction?.return_url) {
           return Response.redirect(transaction.return_url, 302);
        }

        if (type === "TRACK_PURCHASE") {
          redirectPath = `/purchase-success?song_id=${transaction?.metadata?.songId || ""}&tx_ref=${tx_ref}`;
        } else if (type === "ALBUM_PURCHASE") {
          redirectPath = `/purchase-success?album_id=${transaction?.metadata?.albumId || ""}&type=album_purchase&tx_ref=${tx_ref}`;
        } else if (type === "TIP") {
          redirectPath = `/tip-success?artist_id=${transaction?.metadata?.artistId || ""}&tx_ref=${tx_ref}`;
        } else if (type === "FAN_SUBSCRIPTION") {
          redirectPath = `/subscribe-success?artist_id=${transaction?.metadata?.artistId || ""}&tx_ref=${tx_ref}`;
        } else if (type.includes("LISTENER_")) {
          redirectPath = `/upgrade-success?plan=${transaction?.metadata?.plan || "Premium"}&tx_ref=${tx_ref}`;
        } else if (type.startsWith("ARTIST_") && type !== "ARTIST_AD_CAMPAIGN") {
          redirectPath = `/tier-success?tx_ref=${tx_ref}`;
        } else {
          redirectPath = `/?payment_success=true&tx_ref=${tx_ref}`;
        }

        return Response.redirect(`https://play-smashify.vercel.app${redirectPath}`, 302);
      }
      return Response.redirect(defaultRedirect, 302);
    }

    // --- Webhook POST processing ---
    const bodyText = await req.text();
    const signature = req.headers.get("x-paychangu-signature");

    if (!PAYCHANGU_WEBHOOK_SECRET) {
      console.error("WEBHOOK_SECRET not configured");
      return new Response("Config Error", { status: 500 });
    }

    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(PAYCHANGU_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signatureBytes = hexToBytes(signature);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(bodyText),
    );

    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const eventData = payload.data || payload;
    const tx_ref = eventData.tx_ref || payload.tx_ref || eventData.reference || payload.reference;
    const status = (eventData.status || payload.status || "").toLowerCase();
    const amount = Number(eventData.amount || payload.amount || 0);

    console.log(`Webhook received for ${tx_ref}, status: ${status}`);

    const isSuccess = ["successful", "success", "paid"].includes(status);
    
    if (isSuccess && tx_ref) {
       // Invoke atomic RPC for fulfillment
       const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_payment_order', {
          p_paychangu_ref: tx_ref,
          p_gateway_amount: amount
       });

       if (rpcErr) {
          console.error(`RPC Error for ${tx_ref}:`, rpcErr);
          return new Response(`Fulfillment Failed: ${rpcErr.message}`, { status: 500 });
       }
       
       if (!rpcRes?.success) {
          console.error(`Business logic failure for ${tx_ref}:`, rpcRes?.error);
          return new Response(`Business Error: ${rpcRes?.error}`, { status: 500 });
       }

       console.log(`RPC Success for ${tx_ref}:`, rpcRes);
    } else if (["failed", "cancelled", "expired"].includes(status)) {
       await supabase.from("transactions").update({ status: "failed" }).eq("paychangu_ref", tx_ref).eq("status", "pending");
    }

    return new Response("Success", { status: 200 });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(`Internal error: ${error?.message || error}`, { status: 200 });
  }
});
