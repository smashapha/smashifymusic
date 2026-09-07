import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('public_songs').select('id, title, release_date').gt('release_date', new Date().toISOString().split('T')[0]);
  console.log("Unreleased songs:", data, error);
}
test();
