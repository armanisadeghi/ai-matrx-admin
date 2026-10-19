import type { BadgeTone } from "@ai-matrx/design-system/controls";
import type { CheckOutcome, TestCaseView, TestRunStatus, TestVerdict } from "./types";

/** How each verdict reads and whether it counts toward the pass rate (PLAN §2.5). */
export const VERDICT_META: Record<
  TestVerdict,
  { label: string; tone: BadgeTone; counted: "pass" | "fail" | "excluded" }
> = {
  pass: { label: "Pass", tone: "success", counted: "pass" },
  pass_judged: { label: "Pass (judged)", tone: "success", counted: "pass" },
  fail: { label: "Fail", tone: "destructive", counted: "fail" },
  fail_format: { label: "Format", tone: "warning", counted: "fail" },
  inconclusive: { label: "Undecided", tone: "neutral", counted: "excluded" },
  blocked: { label: "Blocked", tone: "warning", counted: "excluded" },
  error: { label: "Error", tone: "destructive", counted: "excluded" },
};

export const VERDICT_ORDER: readonly TestVerdict[] = [
  "pass",
  "pass_judged",
  "fail",
  "fail_format",
  "inconclusive",
  "blocked",
  "error",
];

export function isTestVerdict(value: unknown): value is TestVerdict {
  return typeof value === "string" && value in VERDICT_META;
}

export const OUTCOME_META: Record<
  CheckOutcome,
  { label: string; tone: BadgeTone }
> = {
  pass: { label: "Pass", tone: "success" },
  fail: { label: "Fail", tone: "destructive" },
  undecided: { label: "Undecided", tone: "neutral" },
  not_applicable: { label: "N/A", tone: "neutral" },
};

export const RUN_STATUS_META: Record<
  TestRunStatus,
  { label: string; tone: BadgeTone; live: boolean }
> = {
  queued: { label: "Queued", tone: "neutral", live: true },
  running: { label: "Running", tone: "info", live: true },
  succeeded: { label: "Finished", tone: "success", live: false },
  failed: { label: "Failed", tone: "destructive", live: false },
  cancelled: { label: "Canceled", tone: "neutral", live: false },
  paused_limit: { label: "Paused: spend cap", tone: "warning", live: false },
  paused_approval: { label: "Paused: approval", tone: "warning", live: false },
  paused_credential: { label: "Paused: key", tone: "warning", live: false },
};

export function runStatusMeta(status: string) {
  return (
    RUN_STATUS_META[status as TestRunStatus] ?? {
      label: status,
      tone: "neutral" as BadgeTone,
      live: false,
    }
  );
}

/** Pass rate over counted verdicts only; null when nothing counted yet. */
export function passRate(
  byVerdict: Partial<Record<TestVerdict, number>>,
): number | null {
  let pass = 0;
  let counted = 0;
  for (const verdict of VERDICT_ORDER) {
    const n = byVerdict[verdict] ?? 0;
    const meta = VERDICT_META[verdict];
    if (meta.counted === "excluded") continue;
    counted += n;
    if (meta.counted === "pass") pass += n;
  }
  return counted === 0 ? null : pass / counted;
}

export const DOOR_LABEL: Record<string, string> = {
  manual: "Builder",
  manual_chat: "Builder chat",
  agents: "Agent API",
  mandates: "Mandate",
  mcp_agent_run: "MCP",
  agent_call: "Agent call",
  parity: "Across doors",
};

export const OUTCOME_STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  refused_by_agent: "Agent refused",
  refused_by_platform: "Platform refused",
  refused_by_validation: "Refused before the model",
  error: "Error",
};

export function doorLabel(door: string | null): string | null {
  if (!door) return null;
  return DOOR_LABEL[door] ?? door;
}

/** "3 checks · 2 facts": what decides a case (a case with neither is always undecided). */
export function caseDecidersLine(c: Pick<TestCaseView, "checkCount" | "factCount">): string {
  const parts: string[] = [];
  if (c.checkCount > 0) parts.push(`${c.checkCount} ${c.checkCount === 1 ? "check" : "checks"}`);
  if (c.factCount > 0) parts.push(`${c.factCount} ${c.factCount === 1 ? "fact" : "facts"}`);
  return parts.join(" · ") || "Nothing to decide";
}

/** The judge row's side note: its model, and "Advisory" when its word decides nothing. */
export function judgeMeta(
  model: string | null,
  outcome: { model: string | null; advisory: boolean } | null,
): string | undefined {
  const parts = [model ?? outcome?.model ?? null];
  if (outcome?.advisory) parts.push("Advisory");
  const text = parts.filter(Boolean).join(" · ");
  return text || undefined;
}
