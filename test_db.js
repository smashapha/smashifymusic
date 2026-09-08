import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('artist_catalog').select('full_name, stage_name, artist_tier');
  const rising = data?.filter(x => x.artist_tier?.toLowerCase().includes('rising'));
  console.log("RisingStar users:", rising, "Total:", rising?.length, "error:", error);
}
test();
