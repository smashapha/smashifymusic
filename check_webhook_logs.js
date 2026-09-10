import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: logs, error } = await supabase
    .from("webhook_logs")
    .select("*")
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log("Error:", error);
  console.log("Logs count:", logs?.length);
  logs?.forEach(l => console.log(l.tx_ref, l.type, l.status, l.created_at));
}
run();
