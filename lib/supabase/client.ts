import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "../database.types";

/**
 * Browser-safe Supabase client. Uses only the **anon** key, which is
 * intentionally public and subject to Row Level Security on every table.
 * Import this from Client Components; never import `lib/supabase/server.ts`
 * from client code.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
