const fs = require('fs');

const files = [
  'supabase/functions/create-payment/index.ts',
  'supabase/functions/verify-payment/index.ts',
  'supabase/functions/process-payout/index.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/const ALLOWED_ORIGINS = \[.*\]\n/g, '');
  
  content = content.replace(/function getCorsHeaders\(req: Request\) \{\n  const origin = req.headers.get\('Origin'\) \|\| ''\n  return \{\n    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes\(origin\) \? origin : ALLOWED_ORIGINS\[0\],\n    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',\n  \}\n\}/g, `export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}`);

  content = content.replace(/    const origin = req.headers.get\('Origin'\) \|\| ''\n    if \(!ALLOWED_ORIGINS.includes\(origin\)\) \{\n      return new Response\('Forbidden', \{ status: 403 \}\)\n    \}/g, `    const origin = req.headers.get('Origin') || '*';`);

  fs.writeFileSync(file, content);
}
console.log("Done");
