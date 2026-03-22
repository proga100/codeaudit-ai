"use client";
import { ShieldCheck, Shield, Users, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AuditType = "full" | "security" | "team-collaboration" | "code-quality";

const AUDIT_TYPES = [
  { id: "full" as const, icon: ShieldCheck, title: "Full Audit", description: "13 phases: architecture, security, code quality, team practices, and dependencies" },
  { id: "security" as const, icon: Shield, title: "Security-Only", description: "5 phases: vulnerabilities, auth, secrets, and injection risks" },
  { id: "team-collaboration" as const, icon: Users, title: "Team & Collaboration", description: "4 phases: git history, PR patterns, ownership, and contributor health" },
  { id: "code-quality" as const, icon: Code2, title: "Code Quality", description: "4 phases: maintainability, test coverage, documentation, and complexity" },
] as const;

interface AuditTypeCardsProps {
  value: AuditType;
  onChange: (value: AuditType) => void;
}

export function AuditTypeCards({ value, onChange }: AuditTypeCardsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Audit Type</p>
      <div className="grid grid-cols-2 gap-3">
        {AUDIT_TYPES.map(({ id, icon: Icon, title, description }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
              "hover:border-muted-foreground/50 hover:bg-accent/50",
              value === id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card"
            )}
          >
            <Icon className={cn("h-5 w-5", value === id ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium leading-none">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
