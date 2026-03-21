"use client";

import { useState, useTransition } from "react";
import { Github, ExternalLink, AlertTriangle, Check, Loader2 } from "lucide-react";
import { disconnectGitHubAction } from "@/actions/github";

interface Installation {
  id: string;
  installationId: number;
  accountLogin: string;
  accountType: "User" | "Organization";
  createdAt: Date;
}

interface Props {
  installation: Installation | null;
  installUrl: string;
  manageUrl: string | null;
  userId: string;
}

function DisconnectConfirmDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Disconnect GitHub?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Disconnecting will remove repo access from CodeAudit. Any active
              audits using GitHub repos may fail. You can reconnect at any time.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-1.5 text-sm rounded border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-3 py-1.5 text-sm rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

export function GitHubSettingsClient({
  installation: initialInstallation,
  installUrl,
  manageUrl,
  userId,
}: Props) {
  const [installation, setInstallation] = useState(initialInstallation);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDisconnect() {
    startTransition(async () => {
      if (!installation) return;
      const result = await disconnectGitHubAction(installation.id);
      if (result.success) {
        setInstallation(null);
        setShowConfirm(false);
      } else {
        setError(result.error);
        setShowConfirm(false);
      }
    });
  }

  if (!installation) {
    return (
      <>
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Github className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">GitHub not connected</p>
                <p className="text-xs text-muted-foreground">
                  Install the GitHub App to grant repo access
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Per-repo access model</p>
              <p className="text-xs leading-relaxed">
                CodeAudit uses a GitHub App with{" "}
                <code className="bg-muted px-1 rounded">Contents: read</code> permission — not
                a broad OAuth token. You choose exactly which repositories CodeAudit can see.
              </p>
            </div>

            <a
              href={installUrl}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm rounded bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
            >
              <Github className="h-4 w-4" />
              Connect GitHub
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
      </>
    );
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Connected status */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Github className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {installation.accountLogin}
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <Check className="h-3 w-3" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {installation.accountType} &middot; Installation ID{" "}
                {installation.installationId} &middot; Connected{" "}
                {new Date(installation.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Manage repositories link */}
          {manageUrl && (
            <a
              href={manageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full px-4 py-3 text-sm rounded border border-border hover:bg-accent transition-colors"
            >
              <span className="text-foreground">Manage repositories</span>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                Opens GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </a>
          )}
        </div>

        {/* Danger zone */}
        <div className="border-t border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Disconnect GitHub</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Removes repo access. Existing audits may be affected.
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
              className="px-3 py-1.5 text-xs rounded border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}

      {showConfirm && (
        <DisconnectConfirmDialog
          onConfirm={handleDisconnect}
          onCancel={() => setShowConfirm(false)}
          isPending={isPending}
        />
      )}
    </>
  );
}
