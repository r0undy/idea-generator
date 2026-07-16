import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Email-confirmation callback. Supabase's confirmation email links here with
 * a `token_hash` + `type`; exchanging it establishes the session via
 * cookies, then redirects into the app.
 *
 * Requires the Confirm signup email template's `{{ .ConfirmationURL }}` to
 * be pointed at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
 * (configured via the Supabase MCP `apply_migration`-adjacent auth config,
 * or the Dashboard's Auth > Templates page).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/";
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "confirm-failed");
  return NextResponse.redirect(redirectTo);
}
