const fs = require('fs');

let verifyContent = fs.readFileSync('verify-payment.txt', 'utf8');

// replace import { getCorsHeaders } with the actual implementation
const corsCode = `
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://play-smashify.vercel.app",
  "https://play.smashify.tv",
  "https://smashify.tv"
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}
`;

verifyContent = verifyContent.replace('import { getCorsHeaders } from "../_shared/cors.ts";', corsCode);

fs.writeFileSync('verify-payment.txt', verifyContent);
console.log("Inlined cors.ts into verify-payment.txt");
