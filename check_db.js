import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('profiles').select('id, artist_tier, agent_reference').limit(1);
  console.log("PROFILES:", error || data);
  
  const { data: tp, error: tpe } = await supabase.from('user_profiles').select('id, artist_tier').limit(1);
  console.log("USER_PROFILES:", tpe || tp);
}

run();
