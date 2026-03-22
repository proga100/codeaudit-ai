// Standalone phase runner registry — no circular dependencies.
// Both orchestrator.ts and phases/index.ts import from here.

export type PhaseRunner = (config: import("./orchestrator").AuditRunContext, phaseNumber: number) => Promise<void>;

const phaseRunners: Map<number, PhaseRunner> = new Map();

export function registerPhaseRunner(phaseNumber: number, runner: PhaseRunner): void {
  phaseRunners.set(phaseNumber, runner);
}

export function getPhaseRunner(phaseNumber: number): PhaseRunner | undefined {
  return phaseRunners.get(phaseNumber);
}
