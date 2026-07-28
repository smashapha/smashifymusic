import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('*')
    .limit(1);
    
  if (data) {
     if (data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
     } else {
        console.log("No data, try inserting a dummy row then rollback, or just checking insert error.");
        const { error: insError } = await supabase.from('playlist_songs').insert({}).select();
        console.log("Insert Error gives columns:", insError);
     }
  }
}
test();
