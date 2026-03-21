import { redirect } from "next/navigation";
import { getRequiredSession } from "@/lib/auth";
import { getDb, githubInstallations } from "@codeaudit/db";
import { eq } from "drizzle-orm";
import { getGitHubAppInstallUrl, getGitHubAppManageUrl } from "@/lib/github-app";
import { GitHubSettingsClient } from "./github-settings-client";

export default async function GitHubSettingsPage() {
  const session = await getRequiredSession();

  // Fetch current GitHub App installations for this user
  let installation: {
    id: string;
    installationId: number;
    accountLogin: string;
    accountType: "User" | "Organization";
    createdAt: Date;
  } | null = null;

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: githubInstallations.id,
        installationId: githubInstallations.installationId,
        accountLogin: githubInstallations.accountLogin,
        accountType: githubInstallations.accountType,
        createdAt: githubInstallations.createdAt,
      })
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, session.user.id))
      .limit(1);

    if (rows.length > 0) {
      installation = rows[0] as typeof installation;
    }
  } catch {
    // DB not available in dev — show disconnected state
  }

  const installUrl = getGitHubAppInstallUrl("/settings/github");
  const manageUrl = installation
    ? getGitHubAppManageUrl(installation.installationId)
    : null;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">GitHub Connection</h1>
      <p className="mt-2 text-muted-foreground">
        Manage the GitHub App installation that gives CodeAudit access to your
        repositories.
      </p>

      <div className="mt-8">
        <GitHubSettingsClient
          installation={installation}
          installUrl={installUrl}
          manageUrl={manageUrl}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}
