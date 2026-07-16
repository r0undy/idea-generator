---
inclusion: always
---

# Tech Stack

This is a **web-based, mobile-first** application. Design and build for small touch
screens first, then scale up to larger viewports.

## Core Stack

- **Framework:** Next.js (App Router) with TypeScript.
- **Styling:** Tailwind CSS. Use utility classes; keep design tokens in the Tailwind config.
- **Backend & Data:** Supabase (hosted Postgres, Auth, Storage, and Realtime).
- **Deployment target:** Web (responsive, mobile-first).

## Frontend Conventions

- Prefer **Server Components** by default; add `"use client"` only when a component
  needs interactivity, browser APIs, or client state.
- Use **Next.js API routes / Route Handlers** (or Server Actions) for server-side logic
  that must not run on the client.
- Keep components small and composable. Co-locate component-specific styles and logic.
- Use TypeScript everywhere. Type Supabase responses using generated types.

## Mobile-First Rules

- Design layouts for narrow viewports first; layer on `sm:`, `md:`, `lg:` breakpoints
  to enhance for larger screens.
- Target touch: comfortable tap targets (min ~44px), no hover-only interactions.
- Be mindful of performance on low-end mobile devices. Provide reduced-motion
  fallbacks for heavy animations.

## Supabase Usage

- Use the official `@supabase/supabase-js` client and `@supabase/ssr` for auth/session
  handling in Next.js.
- **Never expose the service-role key to the client.** Use it only in server-side code
  (Route Handlers, Server Actions, server components). The client may use the anon key.
- Enforce **Row Level Security (RLS)** on all tables. Do not rely on client-side checks
  for authorization.
- Use Postgres for persistent data (e.g. users, collections, history). Keep tunable
  config server-side so it can change without a client redeploy.
- Store secrets in environment variables (`.env.local`), never commit them.

## Directory Conventions

- App code under `app/` (routes, layouts, pages).
- Shared UI in `components/`, utilities in `lib/`, Supabase client setup in `lib/supabase/`.
- Database types generated from Supabase in a typed file (e.g. `lib/database.types.ts`).
