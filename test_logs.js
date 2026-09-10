import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
console.log(SUPABASE_URL, SUPABASE_ANON_KEY);
