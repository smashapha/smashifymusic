import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkPending() {
  const { data, error } = await supabase
    .from('moto_feed')
    .select('*, profiles:artist_id(stage_name, avatar_url)')
    .eq('approved', false)
    .or('status.neq.draft,status.is.null')
    .order('created_at', { ascending: true });
    
  console.log("Error:", error);
}

checkPending();
