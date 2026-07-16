import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Signs the current user out and redirects to `/login`. Invoked via a
 * plain form POST (see components/auth/SignOutButton.tsx) so it works
 * without client-side JavaScript.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/login", request.url), { status: 302 });
}
