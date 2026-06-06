import "dotenv/config";
async function run() {
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer dummy`,
      'apikey': process.env.VITE_SUPABASE_ANON_KEY
    },
    body: JSON.stringify({tx_ref: "dummy"})
  };
  
  const res1 = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, fetchOptions);
  console.log("create-payment:", res1.status, await res1.text());
}
run();
