import type { FindingsSeverity } from "@codeaudit-ai/db";

const SEVERITY_COLORS: Record<FindingsSeverity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#71717a",
};

type SeverityBadgeProps = {
  severity: FindingsSeverity;
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const color = SEVERITY_COLORS[severity];

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase border"
      style={{
        backgroundColor: `${color}1a`, // ~10% opacity
        color,
        borderColor: `${color}33`, // ~20% opacity
      }}
    >
      {severity}
    </span>
  );
}
