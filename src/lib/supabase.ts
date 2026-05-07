import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://akclwguqzeijscftatqp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('Supabase Anon Key is missing! Please set VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'dummy_key');
