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
  const headline = `${label} · ${result}${where}${tps && run.result === "pass" ? ` · ${tps} tokens/s` : ""}`;
  let reason = str(m.reason);
  if (!reason && run.result !== "pass") {
    const stage = str(m.stage);
    const code = typeof m.exit_code === "number" ? ` (exit ${m.exit_code})` : "";
    reason = stage ? `stopped at ${stage}${code}` : "no reason was recorded for this run";
  }
  return {
    headline,
    reason: run.result === "pass" && !isCorrection ? null : reason,
    correctedBy: correction ? str(correction.measured?.reason) ?? "a later row corrected this run" : null,
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
