import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('songs')
    .select(`
      *,
      profiles:artist_id (
        full_name,
        stage_name,
        avatar_url,
        verified
      )
    `)
    .eq('approved', true)
    .lte('release_date', today);
  
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Success! count:", data?.length);
  }
}
test();
