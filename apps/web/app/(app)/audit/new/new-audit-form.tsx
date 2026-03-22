"use client";

import { useState } from "react";
import {
  Shield,
  Lock,
  Users,
  Code,
  Zap,
  Check,
  AlertTriangle,
} from "lucide-react";
import { FolderPicker } from "@/components/audit/folder-picker";
import type { AuditType } from "@/components/audit/audit-type-cards";
import type { AuditDepth } from "@/components/audit/depth-toggle";
import { ModelSelector } from "@/components/audit/model-selector";
import { CostEstimate } from "@/components/audit/cost-estimate";
import { ConfirmAuditDialog } from "@/components/audit/confirm-dialog";
import { startAudit } from "@/actions/audit-start";
import { getFolderStats } from "@/actions/folder-stats";
import type { FolderValidationResult } from "@/actions/folders";
import type { ApiKeyRecord } from "@/actions/api-keys";
import type { FolderStats, Provider } from "@/lib/cost-estimator-shared";
import { estimateCostRange } from "@/lib/cost-estimator-shared";

interface NewAuditFormProps {
  initialKeys: ApiKeyRecord[];
}

const AUDIT_TYPES = [
  {
    id: "full" as AuditType,
    icon: Shield,
    label: "Full Audit",
    desc: "All 13 phases: security, quality, dependencies, git history, docs, CI/CD",
  },
  {
    id: "security" as AuditType,
    icon: Lock,
    label: "Security Only",
    desc: "5 phases: secrets, auth, injection, API security, data protection",
  },
  {
    id: "team-collaboration" as AuditType,
    icon: Users,
    label: "Team & Collab",
    desc: "4 phases: git history, PR patterns, ownership, contributor health",
  },
  {
    id: "code-quality" as AuditType,
    icon: Code,
    label: "Code Quality",
    desc: "4 phases: maintainability, test coverage, documentation, complexity",
  },
];

const DEPTHS = [
  {
    id: "quick" as AuditDepth,
    icon: Zap,
    label: "Quick Scan",
    desc: "~30 min, 30% sampling, subset of phases",
  },
  {
    id: "deep" as AuditDepth,
    icon: Shield,
    label: "Deep Audit",
    desc: "1-3 hrs, full analysis, all phases",
  },
];

export function NewAuditForm({ initialKeys }: NewAuditFormProps) {
  const [folderPaths, setFolderPaths] = useState<string[]>([""]);
  const [folderValidations, setFolderValidations] = useState<
    (FolderValidationResult | null)[]
  >([null]);
  const [folderStats, setFolderStats] = useState<FolderStats | null>(null);

  const [auditType, setAuditType] = useState<AuditType>("full");
  const [depth, setDepth] = useState<AuditDepth>("deep");
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    initialKeys[0]?.id ?? null
  );
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedKey = initialKeys.find((k) => k.id === selectedKeyId) ?? null;
  const provider: Provider | null = selectedKey?.provider ?? null;

  async function handleFolderChange(
    paths: string[],
    validations: (FolderValidationResult | null)[]
  ) {
    setFolderPaths(paths);
    setFolderValidations(validations);

    const firstValidIdx = validations.findIndex((v) => v?.valid === true);
    if (firstValidIdx >= 0) {
      const validResult = validations[firstValidIdx];
      if (validResult?.valid) {
        const stats = await getFolderStats(validResult.folderPath);
        setFolderStats(stats);
      }
    } else {
      setFolderStats(null);
    }
  }

  const hasValidFolder = folderValidations.some((v) => v?.valid === true);
  const canSubmit = hasValidFolder && selectedKeyId !== null;

  const costRange = provider
    ? estimateCostRange(folderStats, auditType, depth, provider)
    : null;

  async function handleConfirm() {
    const validFolders = folderValidations
      .map((v, i) =>
        v?.valid
          ? {
              path: folderPaths[i],
              name: (v as Extract<FolderValidationResult, { valid: true }>)
                .folderName,
            }
          : null
      )
      .filter((f): f is { path: string; name: string } => f !== null);

    await startAudit({
      folderPaths: validFolders.map((f) => f.path),
      folderNames: validFolders.map((f) => f.name),
      auditType,
      depth,
      apiKeyId: selectedKeyId!,
      selectedModel,
      llmProvider: selectedKey!.provider,
    });
  }

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-muted)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </label>
  );

  return (
    <div style={{ padding: "36px 40px", maxWidth: 720 }}>
      <h1
        className="fade-in"
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginBottom: 32,
          color: "var(--text)",
        }}
      >
        New Audit
      </h1>

      {/* Folder picker */}
      <div className="fade-in stagger-1" style={{ marginBottom: 28 }}>
        <SectionLabel>Folder to Audit</SectionLabel>
        <FolderPicker value={folderPaths} onChange={handleFolderChange} />
      </div>

      {/* Audit Type */}
      <div className="fade-in stagger-2" style={{ marginBottom: 28 }}>
        <SectionLabel>Audit Type</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {AUDIT_TYPES.map((at) => (
            <div
              key={at.id}
              onClick={() => setAuditType(at.id)}
              style={{
                padding: 16,
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s ease",
                background:
                  auditType === at.id ? "var(--accent-subtle)" : "var(--surface)",
                border: `2px solid ${
                  auditType === at.id ? "var(--accent)" : "var(--border)"
                }`,
                boxShadow:
                  auditType === at.id
                    ? "0 0 0 1px var(--accent), 0 4px 12px rgba(250,204,21,0.08)"
                    : "none",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    background:
                      auditType === at.id
                        ? "rgba(250,204,21,0.13)"
                        : "var(--elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <at.icon
                    style={{
                      width: 16,
                      height: 16,
                      color:
                        auditType === at.id ? "var(--accent)" : "var(--text-muted)",
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 3,
                      color:
                        auditType === at.id
                          ? "var(--text)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {at.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {at.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Depth */}
      <div className="fade-in stagger-3" style={{ marginBottom: 28 }}>
        <SectionLabel>Audit Depth</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {DEPTHS.map((d) => (
            <div
              key={d.id}
              onClick={() => setDepth(d.id)}
              style={{
                padding: 16,
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s ease",
                background:
                  depth === d.id ? "var(--accent-subtle)" : "var(--surface)",
                border: `2px solid ${
                  depth === d.id ? "var(--accent)" : "var(--border)"
                }`,
                boxShadow:
                  depth === d.id
                    ? "0 0 0 1px var(--accent), 0 4px 12px rgba(250,204,21,0.08)"
                    : "none",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <d.icon
                  style={{
                    width: 18,
                    height: 18,
                    color:
                      depth === d.id ? "var(--accent)" : "var(--text-muted)",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color:
                        depth === d.id ? "var(--text)" : "var(--text-secondary)",
                    }}
                  >
                    {d.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {d.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Provider & Model */}
      <div className="fade-in stagger-4" style={{ marginBottom: 28 }}>
        <ModelSelector
          keys={initialKeys.map((k) => ({
            id: k.id,
            provider: k.provider,
            label: k.label,
            maskedKey: k.maskedKey,
          }))}
          selectedKeyId={selectedKeyId}
          selectedModel={selectedModel}
          onKeyChange={setSelectedKeyId}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Cost estimate */}
      <div className="fade-in stagger-5" style={{ marginBottom: 28 }}>
        <CostEstimate
          stats={folderStats}
          auditType={auditType}
          depth={depth}
          provider={provider}
        />
      </div>

      {/* Start */}
      <button
        onClick={() => setDialogOpen(true)}
        disabled={!canSubmit}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          height: 48,
          fontSize: 15,
          fontWeight: 500,
          borderRadius: 10,
          border: "none",
          cursor: canSubmit ? "pointer" : "not-allowed",
          background: "var(--accent)",
          color: "#0a0a0b",
          opacity: canSubmit ? 1 : 0.5,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (canSubmit) {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = canSubmit ? "1" : "0.5";
          e.currentTarget.style.transform = "none";
        }}
      >
        Start Audit
      </button>

      <ConfirmAuditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirm}
        folderPaths={folderValidations
          .map((v, i) => (v?.valid ? folderPaths[i] : null))
          .filter((p): p is string => p !== null)}
        auditType={auditType}
        depth={depth}
        model={selectedModel}
        estimatedCostRange={costRange}
      />
    </div>
  );
}
