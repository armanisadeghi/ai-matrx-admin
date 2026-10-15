// features/marketing/smart-add/streamingFacts.ts
//
// THE STREAMING READER for the facts agent (mandate brand_intake.early_facts, kind `brand_basics`):
// the step's live kind value → the facts that are FINISHED right now, so Smart Add's slots fill
// while the agent is still writing instead of after its whole answer (MKT-085).
//
// It opens NO parse session. It reads the lane's live kind value (`selectLiveKindValue(laneRequestId)`): the
// forming value the server sends on every render_block (`__ir_partial`) while the agent writes, then the
// verified envelope once the block closes. The verified-only read (`selectKindEnvelope`) saw nothing until
// the step's last 0.2 s — that was MKT-085.
//
// THE RATCHET (stream render ratchet): a fact is taken only once the stream has moved PAST it — the
// last entry of a still-open list may be half-written ("123 Ma…"), so it waits for the next entry or
// for the step to settle. What was shown is never taken back: `ratchetFacts` only ever adds.

/** The lane's kind value right now (the shape `selectLiveKindValue` returns). */
export interface LiveKind {
  kind: string;
  value: Record<string, unknown>;
}
import { factsFromPayload, type BrandFact } from "./validate/queue";

/** The kinds whose live list is read as facts (the same ones `factsFromPayload` reads at rest). */
const FACT_KINDS: ReadonlySet<string> = new Set(["brand_basics", "person_basics", "brand_whats_new"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The facts readable RIGHT NOW from the lane's live kind value. `open` = the step is still writing: the list's
 * last entry is held back until the stream moves past it. Returns `[]` for nothing yet, another
 * kind, or nothing finished yet.
 */
export function streamingFacts(live: LiveKind | null | undefined, open: boolean): BrandFact[] {
  if (!live || !FACT_KINDS.has(live.kind)) return [];
  const value = live.value;
  if (!isRecord(value)) return [];
  const listKey = Array.isArray(value.facts) ? "facts" : Array.isArray(value.items) ? "items" : null;
  if (!listKey) return [];
  const list = value[listKey] as unknown[];
  const finished = open ? list.slice(0, -1) : list;
  // Conflicts (what's-new) are read only once the list is closed: they follow the facts in the answer.
  const conflicts = open ? [] : value.conflicts;
  return factsFromPayload({ ...value, conflicts, [listKey]: finished, __kind: live.kind });
}

/** Add `incoming` to `shown` by key; never removes or replaces one already shown. Same array when nothing is new. */
export function ratchetFacts(shown: BrandFact[], incoming: BrandFact[]): BrandFact[] {
  if (!incoming.length) return shown;
  const seen = new Set(shown.map((f) => f.key));
  const added = incoming.filter((f) => !seen.has(f.key) && seen.add(f.key));
  return added.length ? [...shown, ...added] : shown;
}
