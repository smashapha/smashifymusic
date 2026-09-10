import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === 'smashtherealmuzic@gmail.com');
  if (user) {
     const { data, error } = await supabase.from('transactions').select('*').or(`fan_id.eq.${user.id},artist_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(5);
     console.log("Error:", error);
     console.log("User txs:", data?.map(t => ({ ref: t.paychangu_ref, status: t.status, type: t.type })));
  } else {
     console.log("User not found in auth", error);
  }
}
run();
