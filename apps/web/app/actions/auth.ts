"use server";

import { signOut } from "@/auth";

/**
 * Server action to sign out the current user.
 * Clears the session and redirects to the sign-in page.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}
