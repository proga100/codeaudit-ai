import fs from "node:fs/promises";
import path from "node:path";
import { getDb, audits } from "@codeaudit-ai/db";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { markPhaseCompleted } from "../progress-emitter";
import { getModel } from "./shared";
import type { AuditRunContext, PhaseRunner } from "../orchestrator";

/** Strip markdown code fences that LLMs wrap around HTML */
function stripFences(html: string): string {
  return html.replace(/^```\s*html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

export const phase11Runner: PhaseRunner = async (ctx, phaseNumber) => {
  const { auditId, auditOutputDir } = ctx;

  const db = getDb();
  const audit = db.select().from(audits).where(eq(audits.id, auditId)).get();
  const findings = audit?.findings?.findings ?? [];
  const scoreValue = audit?.findings?.summary?.score ?? 0;
  const grade = audit?.findings?.summary?.grade ?? "F";
  const severityCounts = audit?.findings?.summary?.findings_count ?? {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };
  const executiveSummary = findings.slice(0, 10).map((f) =>
    `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}`
  ).join("\n");

  const model = getModel(ctx, phaseNumber);

  // Call 1: Management/executive HTML report
  const { text: rawManagement } = await generateText({
    model,
    prompt: `Generate a self-contained HTML page for a MANAGEMENT codebase audit report.

CRITICAL RULES:
- Output ONLY valid HTML starting with <!DOCTYPE html>. No markdown fences, no explanation.
- NO sidebar navigation. This is a single-column scrollable page.
- All CSS must be in a <style> tag. No external stylesheets or scripts.
- Use a clean, professional dark theme: dark background (#0d1117), light text, colored severity badges.
- Include a light theme toggle (data-theme="light" on <html>) with a button in the header.

DESIGN:
- Header: report title, repo name, date, health score badge, audit type
- Health Score section: large score number with letter grade, colored by health (red <40, yellow 40-70, green >70)
- Severity overview: horizontal bar or pill badges showing counts per severity
- Top findings: cards with severity badge, title, description, recommendation
- Each severity level gets a colored left border (critical=red, high=orange, medium=yellow, low=blue, info=gray)
- Use system fonts (-apple-system, sans-serif), clean spacing, rounded corners on cards

DATA:
Health score: ${scoreValue}/100, grade: ${grade}
Severity: Critical=${severityCounts.critical}, High=${severityCounts.high}, Medium=${severityCounts.medium}, Low=${severityCounts.low}, Info=${severityCounts.info}

${executiveSummary}

<data_block source="findings" trust="internal">
${JSON.stringify(findings.slice(0, 30), null, 2)}
</data_block>`,
    maxOutputTokens: 8192,
  });

  // Call 2: Technical HTML report
  const { text: rawTechnical } = await generateText({
    model,
    prompt: `Generate a self-contained HTML page for a TECHNICAL codebase audit report.

CRITICAL RULES:
- Output ONLY valid HTML starting with <!DOCTYPE html>. No markdown fences, no explanation.
- NO sidebar navigation. This is a single-column scrollable page.
- All CSS must be in a <style> tag. No external stylesheets or scripts.
- Dark theme by default (#0d1117 background), with light theme toggle.

DESIGN:
- Header: "Technical Audit Report", repo name, date, score
- Score card: large number + sub-scores in a grid (security, tests, complexity, dependencies, CI/CD, docs) with mini progress bars
- Severity summary table: severity name, count, progress bar
- Findings grouped by severity (Critical first, then High, Medium, Low, Info):
  - Each finding is a card with: severity badge (colored pill), title, category tag
  - Expandable detail (click to toggle): file paths in monospace, description, recommendation
  - Use chevron icon (▶/▼) for expand state
- Remediation summary at the bottom: ordered list of top fixes
- Use monospace font for file paths and code references
- Clean dark cards (#161b22), subtle borders (#21262d), system fonts

DATA:
Health score: ${scoreValue}/100, grade: ${grade}
Total findings: ${findings.length}
Severity: Critical=${severityCounts.critical}, High=${severityCounts.high}, Medium=${severityCounts.medium}, Low=${severityCounts.low}, Info=${severityCounts.info}

<data_block source="findings" trust="internal">
${JSON.stringify(findings, null, 2)}
</data_block>

Show ALL ${findings.length} findings as expandable cards grouped by severity.`,
    maxOutputTokens: 16384,
  });

  // Strip markdown fences and write
  const managementHtml = stripFences(rawManagement);
  const technicalHtml = stripFences(rawTechnical);

  await fs.writeFile(path.join(auditOutputDir, "report-management.html"), managementHtml, "utf8");
  await fs.writeFile(path.join(auditOutputDir, "report-technical.html"), technicalHtml, "utf8");

  const outputMd = `# Phase 11 — HTML Reports Generated\n\nFiles: report-management.html, report-technical.html\nScore: ${scoreValue}/100 (${grade}), ${findings.length} findings`;

  await markPhaseCompleted(auditId, phaseNumber, outputMd, [], 0);
};
