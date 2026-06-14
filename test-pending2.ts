import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkPending() {
  const { data, error } = await supabase
    .from('songs')
    .select('status')
    .limit(1);
    
  console.log("Error:", error);
  console.log("Data:", data);
}

checkPending();
