/**
 * The words a verification run shows. A non-pass run always says WHY (stage + reason), and a run
 * that a later ledger row corrected says so — the ledger is append-only, so a mistaken `fail` is
 * answered by a correcting row, never deleted. Never a bare "fail".
 */
import type { PromotedVariant, VerificationRun } from "./api";

export interface RunWords {
  headline: string;
  reason: string | null;
  correctedBy: string | null;
  isCorrection: boolean;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function describeRun(run: VerificationRun, all: VerificationRun[]): RunWords {
  const m = run.measured ?? {};
  const isCorrection = m.kind === "correction";
  const correction = all.find((r) => r.id !== run.id && r.measured?.corrects_run_id === run.id);
  const where = run.hardware_class ? ` · ${run.os}/${run.arch} ${run.hardware_class}` : "";
  const label = isCorrection ? "correction" : run.check_kind.replace("_", " ");
  const result = isCorrection ? "harness defect noted" : run.result;
  const tps = str(m.tokens_per_second);
  const target = isCorrection ? str(m.corrects_run_id) : null;
  const targetShown = target ? all.some((r) => r.id === target) : false;
  const headline = `${label} · ${result}${target ? ` for run ${target.slice(0, 8)}` : ""}${where}${
    tps && run.result === "pass" ? ` · ${tps} tokens/s` : ""
  }`;
  let reason = str(m.reason);
  if (!reason && run.result !== "pass") {
    const stage = str(m.stage);
    const code = typeof m.exit_code === "number" ? ` (exit ${m.exit_code})` : "";
    reason = stage ? `stopped at ${stage}${code}` : "no reason was recorded for this run";
  }
  return {
    headline,
    // A correction's words are shown ONCE, on the run it corrects; the correction row itself only
    // names that run (its own reason shows only when that run is not in the list).
    reason: (run.result === "pass" && !isCorrection) || targetShown ? null : reason,
    correctedBy: correction
      ? (str(correction.measured?.reason)?.replace(/^correction:\s*/i, "") || null) ?? "a later row corrected this run"
      : null,
    isCorrection,
  };
}

/** "x86_cpu verified · linux/x86_64 b9076" — one compat row with the build it is about. */
export function compatLabel(c: {
  hardware_class: string;
  status: string;
  runtime_build?: { os: string; arch: string; runtime_version: string | null; is_active?: boolean } | null;
}): string {
  const b = c.runtime_build;
  const build = b ? ` (${b.os}/${b.arch}${b.runtime_version ? ` ${b.runtime_version}` : ""})` : "";
  return `${c.hardware_class} ${c.status}${build}`;
}

export interface TestRequestLine {
  tone: "info" | "error" | "done";
  text: string;
}

/**
 * The line a variant shows for its queued test request (`metadata.test_request`). Every state the
 * runner writes has words: waiting says since when and what to expect, a request that was not run
 * says why, and a finished one points at its run. Unknown states are named, never hidden.
 */
export function describeTestRequest(
  req: NonNullable<NonNullable<PromotedVariant["metadata"]>["test_request"]> | null | undefined,
  when: (iso: string) => string,
): TestRequestLine | null {
  if (!req) return null;
  const since = req.status === "running" ? req.started_at ?? req.requested_at : req.requested_at;
  switch (req.status) {
    case "queued":
    case "running":
      return {
        tone: "info",
        text: `Test ${req.status}${since ? ` since ${when(since)}` : ""}. ${req.expect ?? "The result appears below."}`,
      };
    case "refused":
    case "error":
      return { tone: "error", text: str(req.reason) ?? "The queued test was not run; no reason was recorded." };
    case "done":
      return {
        tone: "done",
        text: `Queued test finished${req.result ? `: ${req.result}` : ""}${
          req.finished_at ? ` at ${when(req.finished_at)}` : ""
        }. Its run is listed below.`,
      };
    default:
      return { tone: "error", text: `Queued test is in an unknown state: ${req.status}.` };
  }
}

/**
 * Why Promote is not available yet, in words — or null when it is. Mirrors the server's refusal
 * (discovery.promote_candidate: no chosen variant, or an open problem that applies to the chosen
 * variants or to the whole repository), so the buttons are never offered for a promote the server
 * would refuse.
 */
export function promoteBlockedBecause(
  ambiguities: readonly { code: string; variant: string | null; words?: string }[],
  chosen: ReadonlySet<string>,
): string | null {
  if (chosen.size === 0) return "Choose at least one variant without an open problem.";
  const blocking = ambiguities.filter((a) => !a.variant || chosen.has(a.variant));
  if (!blocking.length) return null;
  const which = blocking.map((a) => `${a.variant ? `variant ${a.variant}` : "whole repository"}: ${a.words ?? a.code}`);
  return `Make the decisions above first, or leave those variants out (${which.join("; ")}).`;
}
