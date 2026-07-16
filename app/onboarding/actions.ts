"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Saves the new user's first and last name into Supabase auth user_metadata,
 * which the leaderboard reads as the display name. Storing it on the auth user
 * (rather than a separate table) keeps it available in the JWT claims (so the
 * middleware can tell onboarding is complete) and in `auth.admin.listUsers`.
 */
export async function completeOnboarding(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  if (!firstName || !lastName) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        "Please enter both your first and last name.",
      )}`,
    );
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
    },
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
