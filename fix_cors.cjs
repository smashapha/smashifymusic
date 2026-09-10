const fs = require('fs');

const fixCors = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  const corsRegex = /const _ALLOWED_ORIGINS = \[[\s\S]*?\];\s*function getCorsHeaders\([^)]*\) {[\s\S]*?return {[\s\S]*?};\s*}/g;
  const replacement = `function getCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}`;
  if (corsRegex.test(content)) {
    content = content.replace(corsRegex, replacement);
    fs.writeFileSync(filePath, content);
    console.log("Fixed CORS in", filePath);
  } else {
    console.log("Could not find regex in", filePath);
  }
}

fixCors('verify-payment.txt');
fixCors('paychangu-webhook.txt');
