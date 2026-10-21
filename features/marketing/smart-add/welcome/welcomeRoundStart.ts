/**
 * Sign-up welcome — the welcome door's start of a round (SmartAddBrand door="welcome"): the one network call around
 * the pure first round (welcomeRound.ts). Kept apart so the pure round stays importable on the server.
 */

import type { AppDispatch } from "@/lib/redux/store";
import { startSystemRun } from "@/lib/workflows/system-runs";
import { IDENTIFY_WORKFLOW_KEY } from "./welcomeRound";
import { roundSubject } from "./welcomeSession";
import { supabase } from "@/utils/supabase/client";
import { foundSearchState, type FoundSearchState } from "./foundSearchState";
import { foundStateMetadata } from "./foundSearchStart";

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

/**
 * The door started round `n` (a narrowing, a late name, a grounded round): it becomes the found search's latest
 * round on the account, unchecked, so the background check (foundSearchBackground.ts) reads it and the notice logic
 * sees what it found. Live 2026-10-21: a narrowed round found her and `found_search_round` stayed 0. Pure decision in
 * `welcomeRoundPatch`; never lowers the round, never reopens a search they were already told about.
 */
export function welcomeRoundPatch(state: FoundSearchState, n: number): Partial<FoundSearchState> | null {
  if (state.skip || state.shownAt || n <= state.round) return null;
  return { round: n, checkedAt: null, ...(state.startedAt ? {} : { startedAt: new Date().toISOString() }) };
}

export async function recordWelcomeRound(n: number): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return;
  const patch = welcomeRoundPatch(foundSearchState(data.user), n);
  if (!patch) return;
  const { error: saveError } = await supabase.auth.updateUser({ data: foundStateMetadata(patch) });
  if (saveError) console.error("[found-search] The welcome round could not be recorded.", saveError);
}
