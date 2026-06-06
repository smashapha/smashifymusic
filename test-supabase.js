import "dotenv/config";
fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
  method: 'OPTIONS',
  headers: { 'Content-Type': 'application/json', 'apikey': process.env.VITE_SUPABASE_ANON_KEY }
}).then(r => console.log("Supabase OPTIONS Status:", r.status)).catch(e => console.error(e));
