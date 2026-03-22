"use client";
import { cn } from "@/lib/utils";

export type AuditDepth = "quick" | "deep";

const OPTIONS = [
  { id: "quick" as const, label: "Quick Scan", time: "~30 min", note: "30% sampling, subset of phases" },
  { id: "deep" as const, label: "Deep Audit", time: "1–3 hrs", note: "Full analysis, all phases" },
];

interface DepthToggleProps {
  value: AuditDepth;
  onChange: (value: AuditDepth) => void;
}

export function DepthToggle({ value, onChange }: DepthToggleProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Audit Depth</p>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(({ id, label, time, note }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
              "hover:border-muted-foreground/50",
              value === id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card"
            )}
          >
            <p className={cn("text-sm font-medium", value === id ? "text-primary" : "")}>{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{note}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
