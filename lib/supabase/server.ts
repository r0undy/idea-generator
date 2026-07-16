import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "../database.types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Session-aware Supabase client for use in Server Components, Server
 * Actions, and Route Handlers. Uses the **anon** key together with the
 * request's cookies (via `@supabase/ssr`) so that queries run as the
 * authenticated user and are subject to Row Level Security.
 *
 * `cookies()` is async in this Next.js version, so this factory is async.
 * Always create a new client per request — never share one across requests.
 *
 * Server-only: importing this module from a Client Component will fail the
 * build.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `set` is called from a Server Component where cookies cannot be
          // written. This is safe to ignore as long as a middleware (if
          // present) refreshes the session, or session writes happen from a
          // Route Handler / Server Action instead.
        }
      },
    },
  });
}

/**
 * Privileged Supabase client for server-only operations that must bypass Row
 * Level Security, such as reading the service-role-only `drop_rate_config`
 * table. Uses the **service-role** key and never reads or writes auth
 * cookies (it is not tied to any particular user's session).
 *
 * This must never be imported by a Client Component or otherwise reach the
 * browser bundle — doing so would leak the service-role key.
 */
export function createServiceRoleClient() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
