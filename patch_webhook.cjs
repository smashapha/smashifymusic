const fs = require('fs');
let code = fs.readFileSync('supabase/functions/paychangu-webhook/index.ts', 'utf8');

if (!code.includes("getCorsHeaders")) {
    const corsHelper = `
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
`;
    // Insert after imports
    code = code.replace(
        'import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";',
        'import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";\n' + corsHelper
    );
    
    // Add CORS handling to serve
    code = code.replace(
        'serve(async (req) => {',
        'serve(async (req) => {\n  const corsHeaders = getCorsHeaders(req.headers.get("origin"));\n  if (req.method === "OPTIONS") {\n    return new Response("ok", { headers: corsHeaders });\n  }'
    );

    // Apply the same `artistProfile.subscription_price` patch from processSuccessfulPayment to the webhook
    const oldSubscriptionLog = `
      case "FAN_SUBSCRIPTION": {
        const renewsAt = new Date();
        renewsAt.setDate(renewsAt.getDate() + 30);

        const { error: subError } = await supabase
          .from("fan_subscriptions")
          .upsert(
            {
              fan_id: userId,
              artist_id: artistId,
              status: "active",
              amount: grossAmount,
              started_at: new Date().toISOString(),
              next_billing_at: renewsAt.toISOString(),
            },
            { onConflict: "fan_id,artist_id" },
          );`;
          
     // Actually the Webhook just blindly reads `grossAmount` from the transactions table, so we don't need to patch the price reading here! It's already secure because `transactions` table is locked from client writes and only written securely by `create-payment`.
     // But we will add CORS anyway in case the user tests the webhook endpoint directly.
     fs.writeFileSync('supabase/functions/paychangu-webhook/index.ts', code);
     console.log("Patched Webhook");
}
