import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, key);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log("profiles columns:", data ? Object.keys(data[0] || {}) : error);
}
check();
