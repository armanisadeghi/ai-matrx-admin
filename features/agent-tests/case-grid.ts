/**
 * Reading many results at once — pure, so the grid's rules are tested without a database.
 *
 * - `latestByCase`: each case's newest decided-or-not result (the Studio's per-case verdict).
 * - `caseVersionGrid`: cases × agent versions, each cell the newest result of that case on
 *   that version. Results whose version is unknown (no id, or not one of this agent's saved
 *   versions) are left out of the grid rather than guessed into a column.
 */

import type { TestResultView } from "./types";

/** Results that have finished (a queued or running row has no verdict yet). */
function finished(r: TestResultView): boolean {
  return r.verdict !== null;
}

function newer(a: TestResultView, b: TestResultView): boolean {
  return a.createdAt > b.createdAt;
}

export function latestByCase(
  results: readonly TestResultView[],
): Map<string, TestResultView> {
  const out = new Map<string, TestResultView>();
  for (const r of results) {
    if (!finished(r)) continue;
    const seen = out.get(r.caseId);
    if (!seen || newer(r, seen)) out.set(r.caseId, r);
  }
  return out;
}

export interface CaseVersionGrid {
  /** Version numbers with at least one result, newest first. */
  versions: number[];
  cell: (caseId: string, version: number) => TestResultView | null;
}

export function caseVersionGrid(
  results: readonly TestResultView[],
  versionNumbers: ReadonlyMap<string, number>,
): CaseVersionGrid {
  const cells = new Map<string, TestResultView>();
  const versions = new Set<number>();
  for (const r of results) {
    if (!finished(r) || !r.agentVersionId) continue;
    const version = versionNumbers.get(r.agentVersionId);
    if (version === undefined) continue;
    versions.add(version);
    const key = `${r.caseId}:${version}`;
    const seen = cells.get(key);
    if (!seen || newer(r, seen)) cells.set(key, r);
  }
  return {
    versions: [...versions].sort((a, b) => b - a),
    cell: (caseId, version) => cells.get(`${caseId}:${version}`) ?? null,
  };
}

/**
 * Why a case did not pass, in the words a person reads on the case row: the judge's reason, else
 * the deciding check's reason (or its title), else the run's error. Null when it passed or ran
 * no check (nothing to say rather than a made-up reason).
 */
export function failReason(r: TestResultView | undefined): string | null {
  if (!r || r.verdict === null || r.verdict.startsWith("pass")) return null;
  const reason = r.verdictReason?.trim();
  if (reason) return reason;
  const required = r.checks.filter((c) => c.required);
  const deciding = required.find((c) => c.outcome === "fail") ?? required.find((c) => c.outcome === "undecided");
  if (deciding) return deciding.reason.trim() || deciding.title;
  return r.error?.trim() || null;
}
