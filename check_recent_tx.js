import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: txns, error } = await supabase
    .from("transactions")
    .select("*")
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log("Error:", error);
  console.log("Transactions:");
  txns?.forEach(t => console.log(t.paychangu_ref, t.status, t.type, t.created_at, t.fan_id));
}
run();
