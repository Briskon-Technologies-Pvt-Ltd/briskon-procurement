// /lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// ✅ Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * ✅ Persistent Singleton Client (browser-safe)
 * This ensures Supabase Auth state (session) is maintained across page reloads,
 * client navigation, and prevents multiple conflicting instances.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
