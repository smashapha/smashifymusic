import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = `test_${Date.now()}@test.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  console.log("Signup:", error || "success");
  if (data?.session) {
     console.log("Token:", data.session.access_token);
     const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-payment`, {
        method: 'POST',
        headers: {
           'Authorization': `Bearer ${data.session.access_token}`,
           'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tx_ref: 'fake_ref' })
     });
     console.log("Verify status:", res.status);
     console.log("Verify body:", await res.text());
  } else {
     console.log("No session returned. May need email confirmation.");
     // Let's try sign in with fake credentials, it will fail but we just need a token.
     // Actually we can't easily bypass email confirmation without service role key.
  }
}
run();
