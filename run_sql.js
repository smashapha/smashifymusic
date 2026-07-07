const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPA_ADMIN_KEY;
if (!url || !key) {
  console.log("No URL or ADMIN KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const sql = `
  ALTER TABLE songs
    ADD COLUMN IF NOT EXISTS discount_percent smallint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sale_ends_at timestamptz NULL;

  ALTER TABLE songs
    ADD CONSTRAINT songs_discount_percent_range
    CHECK (discount_percent >= 0 AND discount_percent <= 90);
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("Migration applied.");
  }
}
run();
