import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: stuckTxns, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("status", "pending")
    .order('created_at', { ascending: false });
    
  console.log("Error:", error);
  console.log("Stuck transactions count:", stuckTxns?.length);
  if (stuckTxns?.length > 0) {
      console.log("Sample stuck:", stuckTxns[0]);
  }
}
run();
