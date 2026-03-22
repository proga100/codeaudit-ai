import { notFound } from "next/navigation";
import { getDb, audits, auditPhases } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
import { ResultsView } from "./results-view";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const audit = db.select().from(audits).where(eq(audits.id, id)).get();
  if (!audit) notFound();

  const phases = db
    .select()
    .from(auditPhases)
    .where(eq(auditPhases.auditId, id))
    .all();

  return <ResultsView auditId={id} audit={audit} phases={phases} />;
}
