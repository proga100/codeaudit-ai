/**
 * GitHub App webhook handler.
 *
 * Receives GitHub App webhook events and processes:
 * - installation.created — user installed the GitHub App
 * - installation.deleted — user uninstalled the GitHub App
 * - installation_repositories.added — user added repos to the installation
 * - installation_repositories.removed — user removed repos from the installation
 *
 * All payloads are verified via HMAC-SHA256 signature before processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb, githubInstallations } from "@codeaudit/db";
import { eq } from "drizzle-orm";

// ============================================================
// Signature verification
// ============================================================

/**
 * Verify GitHub's HMAC-SHA256 webhook signature.
 * GitHub sends the signature in the X-Hub-Signature-256 header as "sha256=<hex>".
 */
async function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = process.env["GITHUB_APP_WEBHOOK_SECRET"];

  if (!secret) {
    console.error("[webhook] GITHUB_APP_WEBHOOK_SECRET is not set");
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

  const expected = Buffer.from(`sha256=${expectedSignature}`, "utf8");
  const received = Buffer.from(signatureHeader, "utf8");

  // Use timing-safe comparison to prevent timing attacks
  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

// ============================================================
// Event handlers
// ============================================================

interface GitHubInstallationEvent {
  action: "created" | "deleted" | "suspend" | "unsuspend" | "new_permissions_accepted";
  installation: {
    id: number;
    account: {
      login: string;
      type: "User" | "Organization";
    };
    app_id: number;
  };
  sender: {
    login: string;
    id: number;
    type: "User" | "Bot";
  };
  // For app installs via user auth, requester info may be present
  requester?: {
    login: string;
    id: number;
  };
}

interface GitHubInstallationRepositoriesEvent {
  action: "added" | "removed";
  installation: {
    id: number;
    account: {
      login: string;
      type: "User" | "Organization";
    };
  };
  repositories_added?: Array<{ id: number; name: string; full_name: string; private: boolean }>;
  repositories_removed?: Array<{ id: number; name: string; full_name: string; private: boolean }>;
  sender: {
    login: string;
    id: number;
  };
}

async function handleInstallationCreated(payload: GitHubInstallationEvent) {
  const db = getDb();
  const { installation } = payload;

  console.log(
    `[webhook] installation.created: id=${installation.id} account=${installation.account.login}`,
  );

  // We need to find the userId — the webhook doesn't directly provide it.
  // We match on accountLogin (the GitHub username that installed the app).
  // If there are multiple users with the same GitHub login, this is a data integrity issue.
  // For now, we use the sender login to find the matching user account.
  const senderLogin = payload.sender.login;

  // Check if we already have an installation record (may have been created via callback)
  const existing = await db
    .select({ id: githubInstallations.id })
    .from(githubInstallations)
    .where(eq(githubInstallations.installationId, installation.id))
    .limit(1);

  if (existing.length === 0) {
    // No existing record — this webhook fired before the callback completed,
    // or the install happened outside the web app (e.g., from GitHub directly).
    // We can't reliably associate it with a userId without additional lookup.
    // Log for observability — the callback handler should create the record.
    console.log(
      `[webhook] installation.created: no existing record for ${installation.id} (sender: ${senderLogin}). ` +
        "Record will be created on next callback or API call.",
    );
  }
}

async function handleInstallationDeleted(payload: GitHubInstallationEvent) {
  const db = getDb();
  const { installation } = payload;

  console.log(
    `[webhook] installation.deleted: id=${installation.id} account=${installation.account.login}`,
  );

  // Remove the installation record
  const deleted = await db
    .delete(githubInstallations)
    .where(eq(githubInstallations.installationId, installation.id))
    .returning({ id: githubInstallations.id });

  if (deleted.length === 0) {
    console.log(
      `[webhook] installation.deleted: no record found for installation ${installation.id} — already removed or never stored`,
    );
  } else {
    console.log(
      `[webhook] installation.deleted: removed installation ${installation.id}`,
    );
  }
}

async function handleRepositoriesAdded(payload: GitHubInstallationRepositoriesEvent) {
  const repos = payload.repositories_added ?? [];
  console.log(
    `[webhook] installation_repositories.added: installation=${payload.installation.id} repos=${repos.map((r) => r.full_name).join(", ")}`,
  );
  // Future: update a repos cache table. For Phase 1, logging is sufficient.
  // Phase 2 (Repo Browser) will add a repos table and sync these events.
}

async function handleRepositoriesRemoved(payload: GitHubInstallationRepositoriesEvent) {
  const repos = payload.repositories_removed ?? [];
  console.log(
    `[webhook] installation_repositories.removed: installation=${payload.installation.id} repos=${repos.map((r) => r.full_name).join(", ")}`,
  );
  // Future: update a repos cache table and flag any active audits using removed repos.
}

// ============================================================
// Route handler
// ============================================================

export async function POST(request: NextRequest) {
  // Read the raw body for signature verification
  const body = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256");
  const eventType = request.headers.get("x-github-event");

  // Verify signature first — reject tampered payloads immediately
  const isValid = await verifyWebhookSignature(body, signatureHeader);
  if (!isValid) {
    console.warn("[webhook] Rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[webhook] Received event: ${eventType}`);

  try {
    switch (eventType) {
      case "installation": {
        const installPayload = payload as unknown as GitHubInstallationEvent;
        if (installPayload.action === "created") {
          await handleInstallationCreated(installPayload);
        } else if (installPayload.action === "deleted") {
          await handleInstallationDeleted(installPayload);
        }
        break;
      }

      case "installation_repositories": {
        const repoPayload = payload as unknown as GitHubInstallationRepositoriesEvent;
        if (repoPayload.action === "added") {
          await handleRepositoriesAdded(repoPayload);
        } else if (repoPayload.action === "removed") {
          await handleRepositoriesRemoved(repoPayload);
        }
        break;
      }

      default:
        // Acknowledge unknown events without error
        console.log(`[webhook] Ignored event type: ${eventType}`);
    }
  } catch (error) {
    console.error("[webhook] Error processing event:", error);
    // Return 500 so GitHub will retry the event
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
