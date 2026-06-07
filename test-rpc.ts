import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('notifications').insert({
    profile_id: "e535abff-5829-4041-85ef-b7deb71dd190",
    user_type: "artist",
    type: "tip_received",
    message: "Test",
    link: "/test",
  });
  console.log("Insert result:", { data, error });
}
run();
