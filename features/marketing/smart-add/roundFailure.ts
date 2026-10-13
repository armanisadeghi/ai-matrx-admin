/**
 * Whether a Smart Add round "didn't finish": the run itself failed, or any of its steps errored.
 * A step whose lookup errored must read as a failed lookup, never as a clean "Nothing online yet".
 */
import type { RoundView } from "./SmartAddRound";

const FAILED_RUN = ["failed", "errored", "refused"];

export function roundFailed(view: Pick<RoundView, "status" | "steps"> | null | undefined): boolean {
  if (!view) return false;
  return FAILED_RUN.includes(view.status ?? "") || view.steps.some((s) => s.errored === true || s.phase === "failed");
}
