import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, profile_id')
    .eq('name', 'Top Songs Global');
  
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Playlists matching 'Top Songs Global':", data);
  }
}
test();
