import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, key);

async function check() {
  const { data: ac, error: ace } = await supabase.from('agent_commissions').select('*').limit(1);
  console.log("agent_commissions:", ace ? ace.message : "exists");
  
  const { data: ag, error: age } = await supabase.from('agents').select('*').limit(1);
  console.log("agents:", age ? age.message : "exists");
  
  const { data: pr, error: pre } = await supabase.from('profiles').select('agent_reference').limit(1);
  console.log("profiles.agent_reference:", pre ? pre.message : "exists");
}
check();
