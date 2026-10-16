import type { BadgeTone } from "@ai-matrx/design-system/controls";
import type { CheckOutcome, TestRunStatus, TestVerdict } from "./types";

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
  refused: { label: "Refused", tone: "info", counted: "excluded" },
  blocked: { label: "Blocked", tone: "warning", counted: "excluded" },
  error: { label: "Error", tone: "destructive", counted: "excluded" },
};

export const VERDICT_ORDER: readonly TestVerdict[] = [
  "pass",
  "pass_judged",
  "fail",
  "fail_format",
  "inconclusive",
  "refused",
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
  cancelled: { label: "Cancelled", tone: "neutral", live: false },
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
};

export function doorLabel(door: string | null): string | null {
  if (!door) return null;
  return DOOR_LABEL[door] ?? door;
}
