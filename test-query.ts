import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("TRANSACTIONS:");
  console.log(JSON.stringify(data, null, 2));

  const { data: logs } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("WEBHOOK LOGS:");
  console.log(JSON.stringify(logs, null, 2));
}
run();
