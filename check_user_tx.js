import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error: err } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === 'smashtherealmuzic@gmail.com');
  
  if (user) {
    const { data: txns, error } = await supabase
      .from("transactions")
      .select("*")
      .or(`fan_id.eq.${user.id},artist_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
      
    console.log("Error:", error);
    console.log("User transactions count:", txns?.length);
    if (txns?.length > 0) {
        txns.slice(0, 3).forEach(t => console.log(t.paychangu_ref, t.status, t.type, t.created_at));
    }
  } else {
    console.log("User not found via listUsers, checking profiles");
    const { data: p } = await supabase.from('profiles').select('id').eq('email', 'smashtherealmuzic@gmail.com').maybeSingle();
    let uid = p?.id;
    if (!uid) {
        const { data: up } = await supabase.from('user_profiles').select('id').eq('email', 'smashtherealmuzic@gmail.com').maybeSingle();
        uid = up?.id;
    }
    if (uid) {
        const { data: txns, error } = await supabase
          .from("transactions")
          .select("*")
          .or(`fan_id.eq.${uid},artist_id.eq.${uid}`)
          .order('created_at', { ascending: false });
        console.log("Txns:", txns?.length);
        if (txns?.length > 0) {
            txns.slice(0, 3).forEach(t => console.log(t.paychangu_ref, t.status, t.type, t.created_at));
        }
    } else {
        console.log("No user profile found");
    }
  }
}
run();
