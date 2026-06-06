import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "artist@gmail.com",
    password: "Manyungwa265#"
  });
  
  const payload = {
    amount: 1000,
    email: "artist@gmail.com",
    first_name: "Artist",
    last_name: "Test",
    type: "artist_standard",
    tx_ref: "TEST-REF-12347",
    meta: { userId: authData.user.id },
    return_url: "https://ais-dev-mqanea5thkwbq6cnhd3hxr-828774785557.europe-west2.run.app"
  };
  
  const { data, error } = await supabase.functions.invoke('create-payment', { body: payload });
  
  console.log("Invoke data:", data);
  console.log("Invoke error:", error);
}

run();
