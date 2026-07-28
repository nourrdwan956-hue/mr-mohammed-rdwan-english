// lib/supabaseClient.js
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials missing in .env.local');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);