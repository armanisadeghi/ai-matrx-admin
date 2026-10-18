/** Pure rules of the variants panel: what a click will create, and what already exists (prod walk 1, defect 4). */

import type { ParamSet } from "./clone";

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Split the sets a person asked for into the ones that are new and the ones the project already has (a variant's
 * label is built from its overrides, so the same label is the same overrides). Repeats inside the request count once.
 */
export function splitNewSets(sets: readonly ParamSet[], existingLabels: readonly string[]): { fresh: ParamSet[]; reused: ParamSet[] } {
  const seen = [...existingLabels];
  const fresh: ParamSet[] = [];
  const reused: ParamSet[] = [];
  for (const s of sets) {
    if (seen.some((l) => same(l, s.label))) reused.push(s);
    else {
      fresh.push(s);
      seen.push(s.label);
    }
  }
  return { fresh, reused };
}

/** "variant" / "variants" with the number: the button says exactly how many it will make. */
export function countWord(n: number, noun = "variant"): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** The create button's text for what the click does, or null when there is nothing to create. */
export function createButtonText(freshCount: number): string | null {
  return freshCount > 0 ? `Create ${countWord(freshCount)}` : null;
}

/** What the server did with a matrix: how many are new and how many were already there. */
export function matrixOutcomeText(made: ReadonlyArray<{ reused?: boolean }>): string {
  const reused = made.filter((m) => m.reused).length;
  const fresh = made.length - reused;
  if (fresh === 0) return reused === 1 ? "That variant already exists" : `All ${reused} already exist`;
  return reused ? `Created ${countWord(fresh)}; ${reused} already existed` : `Created ${countWord(fresh)}`;
}

/** The label of a variant card whose pin is behind the head. */
export function rebasedLabel(pin: number, head: number): string {
  return pin === head ? "" : `rebased from v${pin}`;
}
