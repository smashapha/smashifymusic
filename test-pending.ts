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
    .select('*, profiles!artist_id(stage_name, full_name, email)')
    .eq('approved', false)
    .order('created_at', { ascending: true });
    
  console.log("Error:", error);
  console.log("Count:", data?.length);
  console.log("Data:", JSON.stringify(data, null, 2));
}

checkPending();
