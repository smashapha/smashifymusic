import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Logs:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
  
  const { data: up, error: upE } = await supabase.from('user_profiles').select('id, full_name, subscription_tier, subscription_ends').limit(5);
  console.log("User Profiles:", JSON.stringify(up, null, 2));
  
  const { data: tx, error: txE } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Transactions:", JSON.stringify(tx, null, 2));
}
run();
