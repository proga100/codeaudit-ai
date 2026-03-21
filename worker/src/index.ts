/**
 * CodeAudit Worker Process
 *
 * Long-running BullMQ worker that processes audit jobs.
 * Runs as a separate Node.js process — NOT inside Next.js.
 *
 * Architecture:
 *   1. Next.js Route Handler enqueues audit job via BullMQ
 *   2. Worker picks up job, starts audit engine
 *   3. Audit engine calls LLM APIs phase by phase
 *   4. Worker emits progress events to Redis pub/sub channel
 *   5. Next.js SSE Route Handler subscribes and streams to browser
 *
 * This process runs on Railway/Fly.io (persistent, not serverless).
 * Vercel Function timeout (300s) makes it unsuitable for long audits.
 *
 * SECURITY: Worker container has read-only filesystem access to cloned
 * repos and no network access to production URLs (enforced by Docker network policy).
 *
 * Implemented in Phase 3.
 */

import "dotenv/config";

// Validate required environment variables
const REDIS_URL = process.env["REDIS_URL"];
const DATABASE_URL = process.env["DATABASE_URL"];

if (!REDIS_URL) {
  console.error("[worker] REDIS_URL environment variable is not set");
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error("[worker] DATABASE_URL environment variable is not set");
  process.exit(1);
}

console.log("[worker] Starting CodeAudit worker...");
console.log("[worker] Redis URL:", REDIS_URL.replace(/\/\/.*@/, "//***@")); // mask credentials
console.log("[worker] Worker is a stub — audit processing will be implemented in Phase 3");

// TODO (Phase 3): Initialize BullMQ Worker
// import { Worker } from "bullmq";
// import IORedis from "ioredis";
//
// const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
//
// const worker = new Worker(
//   "audit-jobs",
//   async (job) => {
//     const { auditId, repoFullName, llmProvider, apiKeyId } = job.data;
//     // ... run audit engine phases
//   },
//   { connection }
// );
//
// worker.on("completed", (job) => {
//   console.log(`[worker] Job ${job.id} completed`);
// });
//
// worker.on("failed", (job, err) => {
//   console.error(`[worker] Job ${job?.id} failed:`, err);
// });

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[worker] SIGTERM received — shutting down gracefully");
  // TODO (Phase 3): await worker.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[worker] SIGINT received — shutting down gracefully");
  // TODO (Phase 3): await worker.close();
  process.exit(0);
});

console.log("[worker] Worker stub running. Waiting for jobs...");
