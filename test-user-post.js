import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "artist@gmail.com",
    password: "Manyungwa265#"
  });
  
  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }
  
  const token = authData.session.access_token;
  console.log("Logged in. User ID:", authData.user.id);
  
  const payload = {
    amount: 1000,
    email: "artist@gmail.com",
    first_name: "Artist",
    last_name: "Test",
    type: "artist_standard",
    tx_ref: "TEST-REF-12345",
    meta: { userId: authData.user.id },
    return_url: "https://ais-dev-mqanea5thkwbq6cnhd3hxr-828774785557.europe-west2.run.app"
  };
  
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': process.env.VITE_SUPABASE_ANON_KEY
    },
    body: JSON.stringify(payload)
  });
  
  console.log("Status:", response.status);
  const text = await response.text();
  console.log("Response text:", text.substring(0, 500));
}

run();
