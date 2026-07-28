import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('playlists')
    .select('*, playlist_songs(id, position, songs(*, profiles:artist_id(full_name, stage_name, avatar_url, verified)))')
    .limit(1);
  
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Success! count:", data?.length);
  }
}
test();
