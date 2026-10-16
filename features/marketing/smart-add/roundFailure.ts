/**
 * Whether a Smart Add round "didn't finish": the run itself failed, or any of its steps errored.
 * A step whose lookup errored must read as a failed lookup, never as a clean "Nothing online yet".
 */
import type { RoundView } from "./SmartAddRound";

const FAILED_RUN = ["failed", "errored", "refused"];
/** The run was ended from outside (its worker died and the recovery budget ran out, or it was cancelled). */
const STOPPED_RUN = ["cancelled", "stopped"];

/** The run stopped before it finished: nothing more will come from it, and the screen says so (MKT-183). */
export function roundStopped(view: Pick<RoundView, "status"> | null | undefined): boolean {
  return Boolean(view) && STOPPED_RUN.includes(view?.status ?? "");
}

export function roundFailed(view: Pick<RoundView, "status" | "steps"> | null | undefined): boolean {
  if (!view) return false;
  return FAILED_RUN.includes(view.status ?? "") || roundStopped(view) || view.steps.some((s) => s.errored === true || s.phase === "failed");
}
