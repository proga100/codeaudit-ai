import { describe, it, expect, vi, beforeEach } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// Mock node:child_process so unlockFolder's chmod never runs for real
// ──────────────────────────────────────────────────────────────────────────────
vi.mock("node:child_process", () => ({
  execFile: vi.fn((_cmd: string, _args: string[], cb: (err: null, result: { stdout: string; stderr: string }) => void) =>
    cb(null, { stdout: "", stderr: "" }),
  ),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Shared state object — each test configures what it needs
// ──────────────────────────────────────────────────────────────────────────────
const mockState = {
  apiKey: {
    encryptedKey: "enc",
    iv: "iv",
    provider: "anthropic" as const,
    baseUrl: null as string | null,
  },
  // Default: audit is "running"; tests can flip this
  auditStatus: "running" as string,
  // Per-phase checkpoint: phaseNumber → "completed" | "running" | null
  // null means the row doesn't exist yet (fresh audit)
  phaseStatuses: new Map<number, string>(),
};

// ──────────────────────────────────────────────────────────────────────────────
// DB mock — table-aware, stateful
// ──────────────────────────────────────────────────────────────────────────────
vi.mock("@codeaudit-ai/db", () => {
  // Build a fresh fluent-chain that remembers which table was selected via .from()
  const makeChain = () => {
    let _table: unknown = null;

    const chain: Record<string, unknown> = {};

    chain.from = vi.fn((table: unknown) => {
      _table = table;
      return chain;
    });
    chain.where = vi.fn(() => chain);
    chain.set = vi.fn(() => chain);
    chain.run = vi.fn(() => undefined);
    chain.all = vi.fn(() => []);
    chain.get = vi.fn(() => {
      if (_table === "apiKeys-table") return mockState.apiKey;
      if (_table === "audits-table") return { status: mockState.auditStatus };
      if (_table === "auditPhases-table") return null; // default: no existing row
      return null;
    });

    return chain as {
      from: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
      run: ReturnType<typeof vi.fn>;
      all: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
    };
  };

  // Expose a db-instance factory that tests can reach via getDb()
  const makeDb = () => ({
    select: vi.fn(() => makeChain()),
    update: vi.fn(() => makeChain()),
  });

  let currentDb = makeDb();

  return {
    getDb: vi.fn(() => currentDb),
    // Isolation model: vi.clearAllMocks() in beforeEach resets call counts on dbInstance.select.
    // Tests that need custom query behavior call overrideSelectGet() to patch dbInstance.select directly.
    // Table sentinels — identity-matched inside chain.get()
    audits: "audits-table",
    auditPhases: "auditPhases-table",
    apiKeys: "apiKeys-table",
    appSettings: "appSettings-table",
    decryptApiKey: vi.fn(() => "sk-test-decrypted"),
    eq: vi.fn((a: unknown, b: unknown) => ({ eq: true, a, b })),
    and: vi.fn((...args: unknown[]) => ({ and: true, args })),
  };
});

// ──────────────────────────────────────────────────────────────────────────────
// Mocks for internal modules
// ──────────────────────────────────────────────────────────────────────────────
vi.mock("./phases/index", () => ({
  // Return only 3 phases — keeps tests fast and predictable
  getPhasesForAuditType: vi.fn(() => [1, 2, 3]),
}));

vi.mock("./phase-registry", () => ({
  getPhaseRunner: vi.fn(),
}));

vi.mock("./progress-emitter", () => ({
  markPhaseRunning: vi.fn().mockResolvedValue(undefined),
  markPhaseCompleted: vi.fn().mockResolvedValue(undefined),
  markPhaseSkipped: vi.fn().mockResolvedValue(undefined),
  markPhaseFailed: vi.fn().mockResolvedValue(undefined),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Lazy imports (must come AFTER vi.mock() calls)
// ──────────────────────────────────────────────────────────────────────────────
import { runAudit } from "./orchestrator";
import { getPhaseRunner } from "./phase-registry";
import { markPhaseFailed, markPhaseRunning, markPhaseSkipped } from "./progress-emitter";
import { getDb } from "@codeaudit-ai/db";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const baseConfig = {
  auditId: "audit-123",
  repoPath: "/tmp/test-repo",
  auditOutputDir: "/tmp/audit-out",
  auditType: "full" as const,
  depth: "quick" as const,
  llmProvider: "anthropic" as const,
  apiKeyId: "key-1",
  selectedModel: null,
};

/**
 * Override the db.select() chain for the next runAudit call.
 * This gives per-test control over what each table query returns.
 */
function overrideSelectGet(
  getHandler: (table: unknown) => unknown,
) {
  const dbInstance = vi.mocked(getDb)();
  vi.mocked(dbInstance.select).mockImplementation(() => {
    let _table: unknown = null;
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn((t: unknown) => { _table = t; return chain; });
    chain.where = vi.fn(() => chain);
    chain.get = vi.fn(() => getHandler(_table));
    chain.all = vi.fn(() => []);
    return chain as unknown as ReturnType<typeof dbInstance.select>;
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────
describe("runAudit — orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.auditStatus = "running";
    mockState.phaseStatuses.clear();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Happy path — all 3 phases run
  // ────────────────────────────────────────────────────────────────────────────
  it("calls the phase runner for each phase when audit is running", async () => {
    const mockRunner = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getPhaseRunner).mockReturnValue(mockRunner);

    overrideSelectGet((table) => {
      if (table === "apiKeys-table") return mockState.apiKey;
      if (table === "audits-table") return { status: "running" };
      if (table === "auditPhases-table") return null; // no existing checkpoints
      return null;
    });

    await runAudit(baseConfig);

    // Phases 1, 2, 3 → runner called 3 times
    expect(mockRunner).toHaveBeenCalledTimes(3);
    // markPhaseRunning must have been called once per phase
    expect(markPhaseRunning).toHaveBeenCalledTimes(3);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Cancel flag stops execution between phases
  // ────────────────────────────────────────────────────────────────────────────
  it("stops when audit status becomes 'cancelled' between phases", async () => {
    // Phase 1 flips the status to 'cancelled' partway through
    const mockRunner = vi.fn().mockImplementationOnce(async () => {
      // Flip state so that the cancel check before phase 2 sees 'cancelled'
      mockState.auditStatus = "cancelled";
    }).mockResolvedValue(undefined);

    vi.mocked(getPhaseRunner).mockReturnValue(mockRunner);

    overrideSelectGet((table) => {
      if (table === "apiKeys-table") return mockState.apiKey;
      // Cancel check reads audits — return current mockState.auditStatus dynamically
      if (table === "audits-table") return { status: mockState.auditStatus };
      if (table === "auditPhases-table") return null;
      return null;
    });

    await runAudit(baseConfig);

    // Only phase 1 ran; phases 2 & 3 were blocked by the cancel flag
    expect(mockRunner).toHaveBeenCalledTimes(1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Checkpoint resume — phases already completed are skipped
  // ────────────────────────────────────────────────────────────────────────────
  it("skips phases whose DB record is already marked completed (checkpoint resume)", async () => {
    const mockRunner = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getPhaseRunner).mockReturnValue(mockRunner);

    overrideSelectGet((table) => {
      if (table === "apiKeys-table") return mockState.apiKey;
      if (table === "audits-table") return { status: "running" };
      // All 3 phases are already "completed" — simulates a resumed audit
      if (table === "auditPhases-table") return { status: "completed" };
      return null;
    });

    await runAudit(baseConfig);

    // No runner should have been called — all 3 phases were skipped via `continue` (line 94, orchestrator.ts)
    expect(mockRunner).not.toHaveBeenCalled();
    // markPhaseSkipped is only called when a phase has NO runner (orchestrator.ts line 100).
    // When a phase is already completed the orchestrator just `continue`s (line 94) — no markPhaseSkipped call.
    expect(markPhaseSkipped).not.toHaveBeenCalled();
    // getDb must have been called multiple times (audit status + per-phase checkpoint queries)
    expect(vi.mocked(getDb).mock.calls.length).toBeGreaterThan(1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Phase failure is non-fatal — orchestrator continues to next phases
  // ────────────────────────────────────────────────────────────────────────────
  it("marks a phase as failed but continues to next phases when runner throws", async () => {
    const mockRunner = vi.fn();
    // Phase 1 throws; phases 2 and 3 succeed
    mockRunner
      .mockRejectedValueOnce(new Error("LLM timeout"))
      .mockResolvedValue(undefined);

    vi.mocked(getPhaseRunner).mockReturnValue(mockRunner);

    overrideSelectGet((table) => {
      if (table === "apiKeys-table") return mockState.apiKey;
      if (table === "audits-table") return { status: "running" };
      if (table === "auditPhases-table") return null;
      return null;
    });

    await runAudit(baseConfig);

    // markPhaseFailed called exactly once — only phase 1 threw
    expect(markPhaseFailed).toHaveBeenCalledTimes(1);
    expect(markPhaseFailed).toHaveBeenCalledWith(
      "audit-123",
      1,
      expect.stringContaining("LLM timeout"),
    );

    // Orchestrator continued — phases 2 and 3 also ran
    expect(mockRunner).toHaveBeenCalledTimes(3);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Finally block — folder is always unlocked even when phases throw
  // ────────────────────────────────────────────────────────────────────────────
  it("unlocks the folder even when every phase throws (finally block guarantee)", async () => {
    const mockRunner = vi.fn().mockRejectedValue(new Error("catastrophic failure"));
    vi.mocked(getPhaseRunner).mockReturnValue(mockRunner);

    overrideSelectGet((table) => {
      if (table === "apiKeys-table") return mockState.apiKey;
      if (table === "audits-table") return { status: "running" };
      if (table === "auditPhases-table") return null;
      return null;
    });

    // runAudit must not throw — errors are caught per-phase and the finally block runs
    await expect(runAudit(baseConfig)).resolves.toBeUndefined();

    // Verify chmod -R u+w was invoked with the correct repo path
    const { execFile } = await import("node:child_process");
    expect(execFile).toHaveBeenCalledWith(
      "chmod",
      ["-R", "u+w", "/tmp/test-repo"],
      expect.any(Function),
    );
  });
});
