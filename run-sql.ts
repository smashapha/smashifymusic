import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, key);

async function run() {
  const sql = fs.readFileSync('FIX_LISTENER_TIER.sql', 'utf-8');
  console.log("Attempting to run SQL using an RPC if it exists...");
  
  // Try to use a common admin rpc if it exists
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  console.log("Result:", data, error);
}
run();
