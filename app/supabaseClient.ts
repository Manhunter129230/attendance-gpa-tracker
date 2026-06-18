import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase Environment Variables. Check your .env.local file configuration parameters."
  );
}

// Named export architecture to enforce strict type alignment across components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);