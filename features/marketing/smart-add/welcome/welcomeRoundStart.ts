/**
 * Sign-up welcome — the welcome door's start of a round (SmartAddBrand door="welcome"): the one network call around
 * the pure first round (welcomeRound.ts). Kept apart so the pure round stays importable on the server.
 */

import type { AppDispatch } from "@/lib/redux/store";
import { startSystemRun } from "@/lib/workflows/system-runs";
import { IDENTIFY_WORKFLOW_KEY } from "./welcomeRound";
import { roundSubject } from "./welcomeSession";

/** Start (or rejoin, while it is still running) round `n` of the session `base` with these inputs. */
export function startWelcomeRound(
  dispatch: AppDispatch,
  { base, n, inputs, organizationId }: { base: string; n: number; inputs: Record<string, unknown>; organizationId: string },
): Promise<{ runId: string; duplicate: boolean }> {
  return startSystemRun(
    dispatch,
    IDENTIFY_WORKFLOW_KEY,
    { subject: roundSubject(base, n), organizationId, sourceFeature: "marketing", inputs },
    "Identification could not start.",
  );
}
