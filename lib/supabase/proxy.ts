import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase Auth session on every matched request and redirects
 * unauthenticated visitors to `/login`. Called from the root `proxy.ts`
 * (Next.js 16's file-based request interception convention).
 *
 * Routes left public: `/login`, `/register`, and `/auth/*` (the email-
 * confirmation callback). Everything else - the pull screen, history,
 * leaderboard - requires a session, since pulls, pity, and history are
 * per-user. Signed-in users without a display name yet are routed to
 * `/onboarding` until they complete it.
 *
 * Uses `getUser()` to verify identity: it revalidates against the Auth server
 * rather than trusting an unverified cookie. This also returns the freshest
 * `user_metadata`, which the onboarding gate depends on: `updateUser()` saves
 * the name to the user record without immediately reissuing the access-token
 * JWT, so reading the name from the JWT (via `getClaims()`) would be stale and
 * trap the user on /onboarding forever.
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

  // Do not run code between createServerClient and getUser() - see
  // Supabase's SSR auth guide for why this ordering matters.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublicRoute = isAuthPage || pathname.startsWith("/auth");

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!user && !isPublicRoute) {
    return redirectTo("/login");
  }

  if (user) {
    // Onboarding is complete once a first name is present in user_metadata.
    // Read from the authoritative user object (getUser), not the JWT, so a
    // freshly-saved name is seen immediately.
    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const hasName = Boolean(String(metadata?.first_name ?? "").trim());
    const onOnboarding = pathname.startsWith("/onboarding");

    if (isAuthPage) {
      return redirectTo(hasName ? "/" : "/onboarding");
    }
    if (!hasName && !onOnboarding) {
      return redirectTo("/onboarding");
    }
    if (hasName && onOnboarding) {
      return redirectTo("/");
    }
  }

  return supabaseResponse;
}
