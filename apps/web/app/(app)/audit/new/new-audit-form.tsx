"use client";

import React, { useState, useCallback, useEffect } from "react";
import { SelectCard } from "@/components/ui/select-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { validateFolder, type FolderValidationResult } from "@/actions/folders";
import { getFolderStats } from "@/actions/folder-stats";
import { startAudit } from "@/actions/audit-start";
import {
  estimateCostRange,
  formatCostRange,
  type FolderStats,
  type AuditType,
  type AuditDepth,
  type Provider,
} from "@/lib/cost-estimator-shared";

// ─── Types ─────────────────────────────────────────────────────────────────

type SerializedApiKey = {
  id: string;
  provider: "anthropic" | "openai" | "gemini";
  label: string;
  maskedKey: string;
  createdAt: string;
  updatedAt: string;
};

type RecentFolder = { folderPath: string; folderName: string };

// ─── Inline SVG icons ──────────────────────────────────────────────────────

function SvgIcon({
  children,
  size = 16,
  className,
}: {
  children: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

// Individual icon components
const ShieldIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <SvgIcon size={size} className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </SvgIcon>
);

const LockIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <SvgIcon size={size} className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </SvgIcon>
);

const UsersIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <SvgIcon size={size} className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </SvgIcon>
);

const CodeIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <SvgIcon size={size} className={className}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </SvgIcon>
);

const ZapIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <SvgIcon size={size} className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </SvgIcon>
);

const CheckIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <SvgIcon size={size} className={className}>
    <polyline points="20 6 9 17 4 12" />
  </SvgIcon>
);

const XIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <SvgIcon size={size} className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </SvgIcon>
);

const AlertIcon = ({ size = 14, className }: { size?: number; className?: string }) => (
  <SvgIcon size={size} className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </SvgIcon>
);

// ─── Section label ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-2.5">
      {children}
    </label>
  );
}

// ─── Provider label helpers ────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

// ─── NewAuditForm ──────────────────────────────────────────────────────────

export function NewAuditForm({
  apiKeys,
  recentFolders,
}: {
  apiKeys: SerializedApiKey[];
  recentFolders: RecentFolder[];
}) {
  // Folder state
  const [folder, setFolder] = useState("");
  const [folderValidation, setFolderValidation] = useState<FolderValidationResult | null>(null);
  const [folderStats, setFolderStats] = useState<FolderStats | null>(null);
  const [validating, setValidating] = useState(false);

  // Audit config state
  const [auditType, setAuditType] = useState<AuditType>("full");
  const [depth, setDepth] = useState<AuditDepth>("deep");

  // Key / model state
  const [selectedKeyId, setSelectedKeyId] = useState(apiKeys[0]?.id ?? "");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Derived: selected provider
  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);
  const selectedProvider: Provider = selectedKey?.provider ?? "anthropic";

  // ─── Folder validation ────────────────────────────────────────────────

  const triggerValidation = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setFolderValidation(null);
        setFolderStats(null);
        return;
      }
      setValidating(true);
      try {
        const result = await validateFolder(value);
        setFolderValidation(result);
        if (result.valid) {
          const stats = await getFolderStats(result.folderPath);
          setFolderStats(stats);
        } else {
          setFolderStats(null);
        }
      } finally {
        setValidating(false);
      }
    },
    []
  );

  const handleFolderBlur = useCallback(() => {
    triggerValidation(folder);
  }, [folder, triggerValidation]);

  const handleChipClick = useCallback(
    (rf: RecentFolder) => {
      setFolder(rf.folderPath);
      triggerValidation(rf.folderPath);
    },
    [triggerValidation]
  );

  // ─── Model fetching ───────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedKeyId) return;
    setLoadingModels(true);
    setSelectedModel(null);
    fetch(`/api/models?keyId=${selectedKeyId}`)
      .then((r) => r.json())
      .then((data: { models: Array<{ id: string; name: string }> }) => {
        setModels(data.models ?? []);
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [selectedKeyId]);

  // ─── Cost estimate ────────────────────────────────────────────────────

  const costRange = estimateCostRange(folderStats, auditType, depth, selectedProvider);
  const costLabel = formatCostRange(costRange);

  // ─── Can start? ───────────────────────────────────────────────────────

  const canStart =
    folder.trim() !== "" &&
    folderValidation?.valid === true &&
    selectedKeyId !== "";

  // ─── Start audit ──────────────────────────────────────────────────────

  const handleStartAudit = async () => {
    if (!folderValidation?.valid) return;
    setStarting(true);
    setStartError(null);
    try {
      await startAudit({
        folderPaths: [folderValidation.folderPath],
        folderNames: [folderValidation.folderName],
        auditType,
        depth,
        apiKeyId: selectedKeyId,
        selectedModel,
        llmProvider: selectedProvider,
      });
    } catch (err) {
      // startAudit throws NEXT_REDIRECT on success — that's expected
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("NEXT_REDIRECT")) {
        setStartError(message);
        setStarting(false);
      }
    }
  };

  // ─── Audit type cards ─────────────────────────────────────────────────

  const auditTypes: Array<{
    id: AuditType;
    label: string;
    desc: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    {
      id: "full",
      label: "Full Audit",
      desc: "All 13 phases: security, quality, dependencies, git history, docs, CI/CD",
      Icon: ShieldIcon,
    },
    {
      id: "security",
      label: "Security Only",
      desc: "5 phases: secrets, auth, injection, API security, data protection",
      Icon: LockIcon,
    },
    {
      id: "team-collaboration",
      label: "Team & Collab",
      desc: "4 phases: git history, PR patterns, ownership, contributor health",
      Icon: UsersIcon,
    },
    {
      id: "code-quality",
      label: "Code Quality",
      desc: "4 phases: maintainability, test coverage, documentation, complexity",
      Icon: CodeIcon,
    },
  ];

  const depthOptions: Array<{
    id: AuditDepth;
    label: string;
    desc: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    {
      id: "quick",
      label: "Quick Scan",
      desc: "~30 min, 30% sampling, subset of phases",
      Icon: ZapIcon,
    },
    {
      id: "deep",
      label: "Deep Audit",
      desc: "1-3 hrs, full analysis, all phases",
      Icon: ShieldIcon,
    },
  ];

  // Group API keys by provider for optgroup rendering
  const keysByProvider = apiKeys.reduce<Record<string, SerializedApiKey[]>>((acc, k) => {
    const p = k.provider;
    if (!acc[p]) acc[p] = [];
    acc[p].push(k);
    return acc;
  }, {});

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      {/* Section 1: Folder to Audit */}
      <div className="fade-in stagger-1 mb-7">
        <SectionLabel>Folder to Audit</SectionLabel>
        <div className="relative">
          <Input
            mono
            placeholder="/Users/you/Projects/my-repo"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            onBlur={handleFolderBlur}
          />
          {/* Spinner while validating */}
          {validating && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="block w-4 h-4 rounded-full border-2 border-border border-t-accent animate-spin" />
            </span>
          )}
          {/* Valid check icon */}
          {!validating && folderValidation?.valid === true && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
              <CheckIcon size={16} />
            </span>
          )}
          {/* Invalid X icon */}
          {!validating && folderValidation?.valid === false && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
              <XIcon size={16} />
            </span>
          )}
        </div>

        {/* Validation error */}
        {folderValidation?.valid === false && (
          <p className="mt-1.5 text-xs text-destructive">{folderValidation.error}</p>
        )}

        {/* Not a git repo warning */}
        {folderValidation?.valid === true && folderValidation.isGitRepo === false && (
          <div className="flex items-center gap-1.5 mt-2 px-2.5 py-2 bg-warning-subtle rounded-lg text-xs text-warning">
            <AlertIcon size={14} />
            Not a git repo — git-specific phases will be skipped
          </div>
        )}

        {/* Recent folder chips */}
        {recentFolders.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {recentFolders.map((rf) => (
              <button
                key={rf.folderPath}
                type="button"
                onClick={() => handleChipClick(rf)}
                className="px-2.5 py-1 rounded-lg border border-border bg-elevated text-text-secondary text-xs font-mono cursor-pointer hover:border-accent transition-colors duration-150"
              >
                {rf.folderName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Audit Type */}
      <div className="fade-in stagger-2 mb-7">
        <SectionLabel>Audit Type</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          {auditTypes.map((at) => (
            <SelectCard
              key={at.id}
              selected={auditType === at.id}
              onClick={() => setAuditType(at.id)}
            >
              <div className="flex gap-3 items-start">
                <div
                  className={`w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center ${
                    auditType === at.id
                      ? "bg-accent/20 text-accent"
                      : "bg-elevated text-text-muted"
                  }`}
                >
                  <at.Icon size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold mb-0.5">{at.label}</div>
                  <div className="text-[11px] text-text-muted leading-snug">{at.desc}</div>
                </div>
              </div>
            </SelectCard>
          ))}
        </div>
      </div>

      {/* Section 3: Audit Depth */}
      <div className="fade-in stagger-3 mb-7">
        <SectionLabel>Audit Depth</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          {depthOptions.map((d) => (
            <SelectCard
              key={d.id}
              selected={depth === d.id}
              onClick={() => setDepth(d.id)}
            >
              <div className="flex gap-3 items-center">
                <div
                  className={`w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center ${
                    depth === d.id
                      ? "bg-accent/20 text-accent"
                      : "bg-elevated text-text-muted"
                  }`}
                >
                  <d.Icon size={18} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold mb-0.5">{d.label}</div>
                  <div className="text-[11px] text-text-muted">{d.desc}</div>
                </div>
              </div>
            </SelectCard>
          ))}
        </div>
      </div>

      {/* Section 4: Provider & Key + Model */}
      <div className="fade-in stagger-4 mb-7">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>Provider &amp; Key</SectionLabel>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-[10px] bg-elevated border border-border text-text text-[13px] appearance-none cursor-pointer outline-none focus:border-accent transition-colors duration-150"
            >
              {apiKeys.length === 0 ? (
                <option value="">No API keys — add one in Settings</option>
              ) : (
                Object.entries(keysByProvider).map(([provider, keys]) => (
                  <optgroup key={provider} label={PROVIDER_LABELS[provider] ?? provider}>
                    {keys.map((k) => (
                      <option key={k.id} value={k.id}>
                        {PROVIDER_LABELS[k.provider] ?? k.provider} — {k.label} ({k.maskedKey})
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>
          <div>
            <SectionLabel>Model</SectionLabel>
            <select
              value={selectedModel ?? ""}
              onChange={(e) => setSelectedModel(e.target.value || null)}
              disabled={loadingModels}
              className="w-full py-2.5 px-3.5 rounded-[10px] bg-elevated border border-border text-text text-[13px] appearance-none cursor-pointer outline-none focus:border-accent transition-colors duration-150 disabled:opacity-60"
            >
              {loadingModels ? (
                <option value="" disabled>
                  Loading models...
                </option>
              ) : (
                <>
                  <option value="">Auto (recommended)</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Section 5: Cost Estimate */}
      <div className="fade-in stagger-4 p-3.5 rounded-xl bg-surface border border-border flex justify-between items-center mb-7">
        <div>
          <div className="text-xs text-text-muted mb-0.5">Estimated cost</div>
          <div className="text-lg font-bold font-mono">{costLabel}</div>
        </div>
        <div className="text-right">
          {folderStats ? (
            <div className="text-xs text-text-muted font-mono">
              {folderStats.fileCount} files · ~{Math.round(folderStats.estimatedTokens / 1000)}k tokens
            </div>
          ) : (
            <div className="text-xs text-text-muted font-mono">~150k tokens (estimate)</div>
          )}
        </div>
      </div>

      {/* Section 6: Start Button */}
      <div className="fade-in stagger-5">
        <Button
          variant="primary"
          size="lg"
          className="w-full justify-center h-12 text-[15px]"
          disabled={!canStart || starting}
          onClick={() => setShowConfirm(true)}
        >
          Start Audit
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Modal open={showConfirm} onClose={() => !starting && setShowConfirm(false)}>
        <h3 className="text-lg font-bold mb-5">Start Audit?</h3>

        <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-4 mb-5 text-[13px]">
          <span className="text-text-muted font-medium">Folder</span>
          <span className="font-mono text-xs break-all">
            {folderValidation?.valid ? folderValidation.folderPath : folder}
          </span>

          <span className="text-text-muted font-medium">Type</span>
          <span className="font-mono text-xs">
            {auditTypes.find((a) => a.id === auditType)?.label}
          </span>

          <span className="text-text-muted font-medium">Depth</span>
          <span className="font-mono text-xs">
            {depthOptions.find((d) => d.id === depth)?.label}
          </span>

          <span className="text-text-muted font-medium">Model</span>
          <span className="font-mono text-xs">
            {selectedModel
              ? (models.find((m) => m.id === selectedModel)?.name ?? selectedModel)
              : "Auto (recommended)"}
          </span>

          <span className="text-text-muted font-medium">Est. Cost</span>
          <span className="font-mono text-xs">{costLabel}</span>
        </div>

        <p className="text-xs text-text-muted p-2.5 bg-elevated rounded-lg mb-6">
          The target folder will be locked read-only during the audit.
        </p>

        {startError && (
          <p className="text-xs text-destructive mb-4">{startError}</p>
        )}

        <div className="flex gap-2.5 justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={starting}
            onClick={() => setShowConfirm(false)}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={starting}
            onClick={handleStartAudit}
          >
            {starting ? "Starting…" : "Start Audit"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
