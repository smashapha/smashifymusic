import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: user } = await supabase.from('profiles').select('id').eq('email', 'smashtherealmuzic@gmail.com').maybeSingle();
  let userId = user?.id;
  if (!userId) {
    const { data: u2 } = await supabase.from('user_profiles').select('id').eq('email', 'smashtherealmuzic@gmail.com').maybeSingle();
    userId = u2?.id;
  }
  
  if (userId) {
     const { data, error } = await supabase.from('transactions').select('*').or(`fan_id.eq.${userId},artist_id.eq.${userId}`).order('created_at', { ascending: false }).limit(5);
     console.log("Error:", error);
     console.log("User txs:", data?.map(t => ({ ref: t.paychangu_ref, status: t.status, type: t.type })));
  } else {
     console.log("User not found");
  }
}
run();
