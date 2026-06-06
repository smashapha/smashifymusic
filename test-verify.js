import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const tx_ref = 'SMASH-ARTIST_ELITE-27f5655e-1895-4c05-b47a-f8c3602877f3-4f3428aa6ccf-1780755102901';
  console.log('Querying for reference:', tx_ref);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('paychangu_ref', tx_ref)
    .maybeSingle();

  if (error) {
    console.error('Error querying transaction:', error);
  } else {
    console.log('Transaction retrieved successfully:', data);
  }
}

run();
