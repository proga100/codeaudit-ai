"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb, githubInstallations } from "@codeaudit/db";
import { eq, and } from "drizzle-orm";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Disconnect the GitHub App installation for the current user.
 * Scoped to userId — cannot disconnect another user's installation.
 */
export async function disconnectGitHubAction(
  installationRecordId: string,
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const db = getDb();

    const deleted = await db
      .delete(githubInstallations)
      .where(
        and(
          eq(githubInstallations.id, installationRecordId),
          eq(githubInstallations.userId, session.user.id),
        ),
      )
      .returning({ id: githubInstallations.id });

    if (deleted.length === 0) {
      return { success: false, error: "GitHub installation not found" };
    }

    revalidatePath("/settings/github");
    revalidatePath("/onboarding/repo");
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect GitHub";
    return { success: false, error: message };
  }
}
