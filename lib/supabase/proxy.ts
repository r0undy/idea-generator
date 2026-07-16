import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase Auth session on every matched request and redirects
 * unauthenticated visitors to `/login`. Called from the root `proxy.ts`
 * (Next.js 16's file-based request interception convention).
 *
 * Routes left public: `/login` (the login/signup screen) and `/auth/*`
 * (the email-confirmation callback). Everything else - the pull screen and
 * the history view - requires a session, since pulls, pity, and history are
 * per-user.
 *
 * Uses `getClaims()` rather than `getSession()` to verify identity: it
 * validates the JWT signature rather than trusting an unverified session
 * read from cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Misconfigured environment - let the request through rather than
    // redirect-looping; the page-level Supabase clients will surface the
    // missing-env error clearly.
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims() - see
  // Supabase's SSR auth guide for why this ordering matters.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;
  const isPublicRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
