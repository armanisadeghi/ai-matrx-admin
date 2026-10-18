/**
 * Agent tests — the client's view of the Agent Evaluation contract.
 *
 * Source of truth: common-docs/projects/agent-evaluation/CONTRACT.md (lane A
 * owns it). Every shape the pages read is declared HERE, once, so binding to a
 * new contract version is a one-file change. Rows arrive as jsonb, so each
 * reader in `service.ts` parses defensively into these view models — an
 * unknown value is shown as unknown, never guessed.
 */

/** Per-result verdict (CONTRACT v2 §2.6). A refusal is an `outcome`, scored by the checks. */
export type TestVerdict =
  | "pass"
  | "pass_judged"
  | "fail"
  | "fail_format"
  | "inconclusive"
  | "blocked"
  | "error";

/** How the door call ended (CONTRACT v2 §2.3). */
export type OutcomeStatus =
  | "completed"
  | "refused_by_agent"
  | "refused_by_platform"
  | "refused_by_validation"
  | "error";

/** A battle's pairwise verdict row (`door='pairwise'`, server `agent_tests/pairwise.py`). */
export interface PairwiseOutcomeView {
  baseline: string;
  challenger: string;
  /** The winning setup key, `tie`, or null when the judge gave no verdict. */
  winner: string | null;
  /** One line naming the real setups. */
  reason: string | null;
  model: string | null;
  /** The judge's own call, for Watch AI. */
  conversationId: string | null;
  requestId: string | null;
}

/** The fact judge's decision as stored on the result's outcome (server `_with_judge`). */
export interface OutcomeJudgeView {
  verdict: string | null;
  /** True when the judge's agreement with people is below the bar: its word decides nothing. */
  advisory: boolean;
  advisoryReason: string | null;
  /** False when the judge's own request lacked an expected fact (`judge_unfed`). */
  fedOk: boolean | null;
  model: string | null;
  missingFacts: string[];
}

export interface OutcomeView {
  status: OutcomeStatus | string;
  message: string | null;
  errorCode: string | null;
  httpStatus: number | null;
  judge: OutcomeJudgeView | null;
}

/** One check's outcome on one result. */
export type CheckOutcome = "pass" | "fail" | "undecided" | "not_applicable";

export type TestRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "paused_limit"
  | "paused_approval"
  | "paused_credential";

/** Door policy: `random` (default), `all`, or `fixed:<door>`. */
export type DoorPolicy = "random" | "all" | `fixed:${TestDoor}`;

export type TestDoor =
  | "manual"
  | "manual_chat"
  | "agents"
  | "mandates"
  | "mcp_agent_run"
  | "agent_call";

export type JudgePolicy = "off" | "on_fail_or_undecided";

/** The doors Phase 1 can drive (PLAN §8 P1: manual + chat variant, agents). */
export const P1_DOORS: readonly TestDoor[] = [
  "manual",
  "manual_chat",
  "agents",
];

/** A test case: an `agent.exemplar` row with `kind='test_case'`. */
export interface TestCaseView {
  id: string;
  agentId: string;
  label: string;
  userInput: string;
  variables: Record<string, unknown>;
  checkCount: number;
  /** Judge facts the case declares (decided by the fact judge). */
  factCount: number;
  door: string;
  updatedAt: string | null;
}

/** One check result as stored on `agent.test_result.checks`. */
export interface CheckResultView {
  id: string;
  title: string;
  proves: string;
  required: boolean;
  outcome: CheckOutcome;
  side: string;
  /** Stored excerpt (≤ 2 KB); `null` when hidden text was redacted (CONTRACT v2 §2.8). */
  observed: string | null;
  expected: string | null;
  observedRedacted: boolean;
  expectedRedacted: boolean;
  /** For a redacted value: its length and the ≤120-char match window, when stored. */
  redactedChars: number | null;
  matchWindow: string | null;
  truncated: boolean;
  expectedSource: string;
  reason: string;
  canFail: boolean | null;
}

export interface VerdictCounts {
  total: number;
  done: number;
  byVerdict: Partial<Record<TestVerdict, number>>;
}

/** `agent.test_run`. */
export interface TestRunView {
  id: string;
  organizationId: string;
  agentIds: string[];
  status: TestRunStatus | string;
  doorPolicy: string;
  repeats: number;
  judgePolicy: string;
  purpose: string;
  aiTestMode: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** Rollup counters kept on the run by `refresh_run`; null while still `{}`. */
  counts: VerdictCounts | null;
  /** numeric(12,4) cents: Σ run + judge. */
  spentCents: number | null;
  archivedAt: string | null;
  maxCostCents: number | null;
  /** The setups' keys → labels (a battle names its sides here). */
  setupLabels: Record<string, string>;
  /** Pairwise judge rounds the run holds; > 0 makes it a battle. */
  pairwiseRounds: number;
  /** A battle's winner, filled by `fetchAgentRuns` (null on a plain run or when not read). */
  battle: { settled: boolean; winnerLabel: string | null } | null;
}

/** `agent.test_result`. */
export interface TestResultView {
  id: string;
  testRunId: string;
  caseId: string;
  setupKey: string;
  repeat: number;
  /** One of the six doors, or `parity` for the row holding same-across-doors checks. */
  door: string;
  doorReason: string;
  eligibleDoors: string[];
  parityGroup: string;
  identityMode: string | null;
  originClass: string | null;
  conversationId: string | null;
  /** The agent version the case ran on (`agent.definition_version.id`). */
  agentVersionId: string | null;
  userRequestIds: string[];
  status: string;
  verdict: TestVerdict | null;
  verdictReason: string | null;
  outcome: OutcomeView | null;
  /** Set only on a battle's pairwise verdict row (`door='pairwise'`). */
  pairwise: PairwiseOutcomeView | null;
  blockedBy: { gate?: string; kind?: string; approvalUrl?: string } | null;
  checks: CheckResultView[];
  judgeVerdictId: string | null;
  runCostCents: number | null;
  judgeCostCents: number | null;
  durationMs: number | null;
  savedAnswer: boolean;
  error: string | null;
  createdAt: string;
}

/** The judge's ledger row for a result (`platform.judge_verdict`). */
export interface JudgeVerdictView {
  id: string;
  verdict: string | null;
  reasoning: string | null;
  confidence: number | null;
  model: string | null;
}

/** POST /agent-tests/runs body (CONTRACT §4.1). */
export interface LaunchRunRequest {
  agent_ids: string[];
  case_ids?: string[] | null;
  door_policy: DoorPolicy;
  repeats: number;
  judge_policy: JudgePolicy;
  purpose: "user" | "platform";
}

export interface RunOptions {
  doorPolicy: DoorPolicy;
  repeats: number;
  judgePolicy: JudgePolicy;
}

export const DEFAULT_RUN_OPTIONS: RunOptions = {
  doorPolicy: "random",
  repeats: 1,
  judgePolicy: "on_fail_or_undecided",
};

/** Who is looking: the user seat may run; the admin mirror is read-only in Phase 1. */
export type AgentTestSeat = "user" | "admin";
