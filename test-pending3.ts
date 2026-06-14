import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkPending() {
  const { data, error } = await supabase.rpc('query_enum_values', { enum_name: 'content_status' });
    
  console.log("Error:", error);
  console.log("Data:", data);
}

checkPending();
