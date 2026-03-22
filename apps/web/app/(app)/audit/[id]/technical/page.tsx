import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb, audits } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";

// ─── Technical Report Page (server component) ────────────────────────────────

export default async function TechnicalReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const audit = db.select().from(audits).where(eq(audits.id, id)).get();

  if (!audit) {
    notFound();
  }

  return (
    <div className="p-9" style={{ maxWidth: 920 }}>
      {/* Header */}
      <div className="mb-5">
        <Link
          href={`/audit/${id}/results`}
          className="text-[13px] text-text-muted hover:text-accent transition-colors inline-flex items-center gap-1 mb-4"
        >
          ← Back to Results
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Technical Report</h1>
          <span className="font-mono text-sm text-text-muted">{audit.folderName}</span>
        </div>
      </div>

      {/* iframe */}
      <div className="flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
        <iframe
          src={`/api/audit/${id}/report/technical`}
          className="w-full flex-1 border-0 rounded-[--radius-card]"
          style={{ minHeight: "80vh" }}
          title="Technical Report"
        />
      </div>
    </div>
  );
}
