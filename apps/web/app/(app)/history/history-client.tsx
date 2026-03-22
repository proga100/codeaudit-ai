"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Folder,
  Trash2,
  ArrowRightLeft,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { deleteAudit, deleteAudits } from "@/actions/audit-delete";
import { HealthScore } from "@/components/ui/health-score";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export type HistoryAudit = {
  id: string;
  folderPath: string;
  folderName: string;
  auditType: string;
  depth: string;
  status: string;
  score: number | null;
  grade: string | null;
  createdAt: string; // ISO string
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const AUDIT_TYPE_LABELS: Record<string, string> = {
  full: "Full Audit",
  security: "Security-Only",
  "team-collaboration": "Team & Collaboration",
  "code-quality": "Code Quality",
};

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------
// Checkbox component (using div role="checkbox" to avoid nesting)
// ---------------------------------------------------------------

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange();
      }}
      style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`,
        background: checked ? "var(--accent)" : "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s ease",
        flexShrink: 0,
        padding: 0,
      }}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0a0a0b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------

function DeleteConfirmModal({
  count,
  onConfirm,
  onCancel,
  isPending,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onCancel}
      />
      <div
        className="fade-in"
        style={{
          position: "relative",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: 28,
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              flexShrink: 0,
              background: "var(--destructive-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 style={{ width: 20, height: 20, color: "var(--destructive)" }} />
          </div>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 4,
                color: "var(--text)",
              }}
            >
              Delete audit{count > 1 ? "s" : ""}?
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {count > 1
                ? `This will permanently delete ${count} selected audits and all associated reports.`
                : "This will permanently delete this audit and all associated reports."}
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--warning)",
            padding: "10px 12px",
            background: "var(--warning-subtle)",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          This action cannot be undone.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              background: "var(--elevated)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              opacity: isPending ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              background: "var(--destructive-subtle)",
              color: "var(--destructive)",
              border: "1px solid rgba(239,68,68,0.19)",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {isPending && (
              <Loader2
                style={{
                  width: 14,
                  height: 14,
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            <Trash2 style={{ width: 14, height: 14 }} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------

export function HistoryClient({ audits }: { audits: HistoryAudit[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<"bulk" | string | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // Group by folderPath
  const grouped = new Map<string, HistoryAudit[]>();
  for (const row of audits) {
    if (!grouped.has(row.folderPath)) grouped.set(row.folderPath, []);
    grouped.get(row.folderPath)!.push(row);
  }

  const allIds = audits.map((a) => a.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const handleDelete = () => {
    startTransition(async () => {
      if (deleteTarget === "bulk") {
        await deleteAudits(Array.from(selected));
        setSelected(new Set());
      } else if (deleteTarget) {
        await deleteAudit(deleteTarget);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget);
          return next;
        });
      }
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const deleteCount =
    deleteTarget === "bulk" ? selected.size : deleteTarget ? 1 : 0;

  // Empty state
  if (audits.length === 0) {
    return (
      <div style={{ padding: "36px 40px", maxWidth: 920 }}>
        <div className="fade-in" style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text)",
            }}
          >
            History
          </h1>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "64px 0",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            No audits yet.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              opacity: 0.6,
              marginTop: 4,
            }}
          >
            Run your first audit to see results here.
          </p>
          <Link
            href="/audit/new"
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 10,
              background: "var(--accent)",
              color: "#0a0a0b",
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Start an audit
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 40px", maxWidth: 920 }}>
      {/* Header */}
      <div
        className="fade-in"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--text)",
          }}
        >
          History
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            onClick={toggleAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <Checkbox checked={allSelected} onChange={toggleAll} />
            Select all
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="fade-in"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderRadius: 12,
            marginBottom: 18,
            background: "var(--surface)",
            border: "1px solid rgba(250,204,21,0.19)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
              {selected.size}
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              {" "}
              audit{selected.size > 1 ? "s" : ""} selected
            </span>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setSelected(new Set())}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 10,
                background: "var(--elevated)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Deselect
            </button>
            <button
              onClick={() => setDeleteTarget("bulk")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 10,
                background: "var(--destructive-subtle)",
                color: "var(--destructive)",
                border: "1px solid rgba(239,68,68,0.19)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
              Delete selected
            </button>
          </div>
        </div>
      )}

      {/* Folder groups */}
      {Array.from(grouped.entries()).map(([folderPath, folderAudits], gi) => {
        const latest = folderAudits[0]!;
        const previous = folderAudits[1];
        const hasCompare = folderAudits.length >= 2;

        return (
          <div
            key={folderPath}
            className={`fade-in stagger-${Math.min(gi + 1, 5)}`}
            style={{ marginBottom: 28 }}
          >
            {/* Folder header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Folder
                  style={{
                    width: 16,
                    height: 16,
                    color: "var(--text-muted)",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text)",
                  }}
                >
                  {latest.folderName}
                </span>
                <span
                  style={{ fontSize: 12, color: "var(--text-muted)" }}
                >
                  ({folderAudits.length} audit
                  {folderAudits.length !== 1 ? "s" : ""})
                </span>
              </div>
              {hasCompare && (
                <Link
                  href={`/audit/compare?a=${latest.id}&b=${previous!.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 10,
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <ArrowRightLeft style={{ width: 14, height: 14 }} />
                  Compare
                </Link>
              )}
            </div>

            {/* Audit rows card */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {folderAudits.map((audit, i) => {
                const typeLabel =
                  AUDIT_TYPE_LABELS[audit.auditType] ?? audit.auditType;
                const depthLabel =
                  audit.depth === "quick" ? "Quick" : "Deep";
                const isSelected = selected.has(audit.id);

                return (
                  <Link
                    key={audit.id}
                    href={`/audit/${audit.id}/results`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px 1fr 1fr 0.7fr 80px 40px",
                      alignItems: "center",
                      padding: "14px 20px",
                      cursor: "pointer",
                      borderBottom:
                        i < folderAudits.length - 1
                          ? "1px solid var(--border-subtle)"
                          : "none",
                      transition: "background 0.15s",
                      background: isSelected
                        ? "var(--accent-subtle)"
                        : "transparent",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = "var(--hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleOne(audit.id)}
                    />

                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {formatRelativeDate(audit.createdAt)}
                    </span>

                    <div style={{ display: "flex", gap: 6 }}>
                      {/* Type badge */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                          background: "var(--accent-subtle)",
                          color: "var(--accent)",
                          border: "1px solid rgba(250,204,21,0.19)",
                        }}
                      >
                        {typeLabel}
                      </span>
                      {/* Depth badge */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                          background:
                            audit.depth === "deep"
                              ? "var(--accent-subtle)"
                              : "rgba(113,113,122,0.12)",
                          color:
                            audit.depth === "deep"
                              ? "var(--accent)"
                              : "var(--text-muted)",
                          border: `1px solid ${
                            audit.depth === "deep"
                              ? "rgba(250,204,21,0.19)"
                              : "rgba(113,113,122,0.19)"
                          }`,
                        }}
                      >
                        {depthLabel}
                      </span>
                    </div>

                    {/* Status */}
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--success)",
                      }}
                    >
                      &#9679; {audit.status}
                    </span>

                    {/* Health score */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      {audit.score != null && audit.grade != null ? (
                        <HealthScore
                          score={audit.score}
                          grade={audit.grade}
                          size="sm"
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            textTransform: "capitalize",
                          }}
                        >
                          {audit.status}
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDeleteTarget(audit.id);
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "var(--destructive-subtle)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            "transparent")
                        }
                      >
                        <Trash2
                          style={{
                            width: 14,
                            height: 14,
                            color: "var(--text-muted)",
                          }}
                        />
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          count={deleteCount}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isPending={isPending}
        />
      )}
    </div>
  );
}
