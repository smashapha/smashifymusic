const fs = require('fs');
const filePath = 'paychangu-webhook.txt';
let content = fs.readFileSync(filePath, 'utf8');

// Replace everything between const corsHeaders = { ... };
const corsRegex = /const corsHeaders = {[\s\S]*?};/g;
if (corsRegex.test(content)) {
  const replacement = `function getCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}`;
  content = content.replace(corsRegex, replacement);
  // Also replace usage of corsHeaders to getCorsHeaders(req.headers.get("origin"))
  content = content.replace(/headers: \{ \.\.\.corsHeaders/g, 'headers: { ...getCorsHeaders(req.headers.get("origin"))');
  // and the OPTIONS check
  content = content.replace(/if \(req\.method === "OPTIONS"\) {[\s\S]*?}/, `if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req.headers.get("origin")) });
  }`);
  
  fs.writeFileSync(filePath, content);
  console.log("Fixed CORS in webhook");
} else {
  console.log("Not found in webhook");
}
