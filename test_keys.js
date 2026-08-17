require('dotenv').config();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminKey = (!SUPABASE_SERVICE_ROLE_KEY || 
        SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SUPABASE_SERVICE_ROLE_KEY' ||
        SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SUPA_ADMIN_KEY') 
        ? process.env.VITE_SUPABASE_ANON_KEY 
        : SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("adminKey prefix:", (adminKey || "").substring(0, 10));
