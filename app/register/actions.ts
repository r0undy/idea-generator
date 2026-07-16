"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Creates a new account with email + password.
 *
 * If email confirmation is enabled (the Supabase default), signUp returns no
 * session and the user is told to check their inbox, then sign in. When the
 * confirmation link is opened (app/auth/confirm/route.ts) they land signed in
 * and the middleware routes them to /onboarding to pick a display name.
 *
 * If email confirmation is disabled, signUp returns a session immediately, so
 * we send them straight to /onboarding.
 */
export async function signup(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }

  redirect("/login?checkEmail=1");
}
