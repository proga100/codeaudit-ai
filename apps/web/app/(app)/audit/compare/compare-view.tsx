"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthScore } from "@/components/ui/health-score";
import { SeverityBar } from "@/components/ui/severity-bar";
import type { SerializedCompareAudit, SerializedFinding } from "./page";

// ─── Severity color mapping ────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, { color: string; label: string }> = {
  critical: { color: "var(--severity-critical)", label: "Critical" },
  high: { color: "var(--severity-high)", label: "High" },
  medium: { color: "var(--severity-medium)", label: "Medium" },
  low: { color: "var(--severity-low)", label: "Low" },
  info: { color: "var(--severity-info)", label: "Info" },
};

// ─── Arrow SVG icons ───────────────────────────────────────────────────────────

function ArrowUpIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CompareViewProps {
  prev: SerializedCompareAudit;
  curr: SerializedCompareAudit;
  resolved: SerializedFinding[];
  newFindings: SerializedFinding[];
  persisted: SerializedFinding[];
}

// ─── Finding row helpers ───────────────────────────────────────────────────────

function FindingRow({
  finding,
  variant,
}: {
  finding: SerializedFinding;
  variant: "resolved" | "new" | "persisted";
}) {
  const severityConfig = SEVERITY_COLORS[finding.severity] ?? SEVERITY_COLORS["info"]!;

  const variantStyles: Record<string, string> = {
    resolved: "bg-success-subtle border-l-[3px] border-success",
    new: "bg-destructive-subtle border-l-[3px] border-destructive",
    persisted: "bg-elevated border-l-[3px] border-border",
  };

  return (
    <div
      className={`p-2.5 px-4 rounded-[10px] mb-1.5 flex items-center gap-2.5 ${variantStyles[variant]}`}
    >
      <Badge color={severityConfig.color}>{severityConfig.label}</Badge>
      <span
        className={`text-[13px] ${
          variant === "resolved"
            ? "line-through text-text-secondary"
            : variant === "persisted"
            ? "text-text-secondary"
            : "text-text"
        }`}
      >
        {finding.title}
      </span>
    </div>
  );
}

// ─── CompareView (client component) ───────────────────────────────────────────

export function CompareView({
  prev,
  curr,
  resolved,
  newFindings,
  persisted,
}: CompareViewProps) {
  const delta = curr.score - prev.score;
  const isPositive = delta >= 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="p-9 px-10 max-w-[920px]">
      {/* Header */}
      <div className="fade-in mb-2">
        <span className="font-mono text-[14px] font-medium">{curr.folderName}</span>
      </div>
      <h1 className="fade-in text-2xl font-bold tracking-tight mb-7">
        Audit Comparison
      </h1>

      {/* Delta banner */}
      <div
        className={`fade-in stagger-1 p-5 px-6 rounded-[--radius-card] mb-7 flex items-center gap-4 ${
          isPositive
            ? "bg-success-subtle border border-success/20"
            : "bg-destructive-subtle border border-destructive/20"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${
            isPositive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          }`}
        >
          {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </div>
        <div>
          <div
            className={`text-2xl font-bold ${
              isPositive ? "text-success" : "text-destructive"
            }`}
          >
            {isPositive ? "+" : ""}
            {delta} points
          </div>
          <div className="text-[13px] text-text-secondary">
            Score {isPositive ? "improved" : "decreased"} from {prev.score} to {curr.score}
          </div>
        </div>
      </div>

      {/* Side-by-side cards */}
      <div className="fade-in stagger-2 grid grid-cols-2 gap-4 mb-7">
        {/* Previous audit */}
        <Card className="text-center">
          <div className="text-[12px] text-text-muted mb-3">
            {formatDate(prev.createdAt)} (Previous)
          </div>
          <div className="flex justify-center mb-3">
            <HealthScore score={prev.score} size="lg" />
          </div>
          <SeverityBar data={prev.severities} />
        </Card>

        {/* Latest audit */}
        <Card className="text-center">
          <div className="text-[12px] text-text-muted mb-3">
            {formatDate(curr.createdAt)} (Latest)
          </div>
          <div className="flex justify-center mb-3">
            <HealthScore score={curr.score} size="lg" />
          </div>
          <SeverityBar data={curr.severities} />
        </Card>
      </div>

      {/* Resolved section */}
      <div className="fade-in stagger-3 mb-6">
        <h3 className="text-[14px] font-semibold text-success mb-2.5 flex items-center gap-2">
          <CheckIcon />
          Resolved ({resolved.length})
        </h3>
        {resolved.map((f, i) => (
          <FindingRow key={i} finding={f} variant="resolved" />
        ))}
      </div>

      {/* New section */}
      <div className="fade-in stagger-4 mb-6">
        <h3 className="text-[14px] font-semibold text-destructive mb-2.5 flex items-center gap-2">
          <AlertIcon />
          New ({newFindings.length})
        </h3>
        {newFindings.map((f, i) => (
          <FindingRow key={i} finding={f} variant="new" />
        ))}
      </div>

      {/* Persisted section */}
      <div className="fade-in stagger-5 mb-6">
        <h3 className="text-[14px] font-semibold text-text-muted mb-2.5 flex items-center gap-2">
          <MinusIcon />
          Persisted ({persisted.length})
        </h3>
        {persisted.map((f, i) => (
          <FindingRow key={i} finding={f} variant="persisted" />
        ))}
      </div>
    </div>
  );
}
