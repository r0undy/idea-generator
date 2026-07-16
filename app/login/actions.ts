"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Signs an existing user in with email + password. Redirects to `/` on
 * success so the pull screen picks up the fresh session immediately, or
 * back to `/login?error=...` with the failure reason encoded in the query
 * string (kept short/URL-safe since this renders in the login page's error
 * panel).
 */
export async function login(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Creates a new account with email + password. Supabase sends a
 * confirmation email (see app/auth/confirm/route.ts for the callback); the
 * user is told to check their inbox rather than redirected straight in,
 * since email confirmation is enabled by default on new projects.
 */
export async function signup(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?checkEmail=1");
}
