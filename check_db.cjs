const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  if (data) {
    console.log(Object.keys(data[0]));
  }
}
main();
