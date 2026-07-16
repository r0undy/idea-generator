import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 request-interception entry point (the successor to
 * `middleware.ts`). Refreshes the Supabase Auth session on every request and
 * redirects unauthenticated visitors to `/login`.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image assets (fantasy background, etc.)
     * - icon / apple-icon / opengraph-image / twitter-image (code-generated
     *   metadata images, e.g. app/icon.tsx, app/opengraph-image.tsx - social
     *   crawlers and share-preview fetchers hit these unauthenticated, so
     *   they must never be redirected to /login)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
