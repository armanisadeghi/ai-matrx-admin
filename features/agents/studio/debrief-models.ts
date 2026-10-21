/**
 * Which models the Debrief may read a run with: the live catalog's text/chat models only.
 * Debrief reads a whole run and writes proposals, so a model must take text instructions, answer in
 * text only (no image / speech / video output), be a normal conversational turn model, still be served
 * (not deprecated, retired or deleted), have room to read a run, and not be the no-cost mock.
 * The picker's own tier gate still decides who may pick the top tier (locked rows stay locked).
 */

/**
 * The organization's opinions on that menu, from the knob register (`chat.debrief.*`, read in
 * `useDebriefModelFilter`). Until the register answers there are none: the filter is `null`, no floor is applied
 * and the short menu is empty, so the full text-model list shows. No value is hard-coded here.
 */
export interface DebriefModelFilter {
  /** A model needs at least this context window to read a run. */
  minContextTokens: number;
  /** The short menu offers models rated at least this. */
  minStrongRating: number;
  /** General models per maker on the short menu. */
  modelsPerMaker: number;
  /** The catalog's gated top rating band. */
  topRatingBand: number;
  /** Case-insensitive pattern of purpose-built models the short menu leaves to "More models". */
  specialistPattern: string;
}

/** The shape of a live catalog row (`useModelCatalog().models`). */
export interface DebriefModelRow {
  id: string;
  name: string;
  interaction?: string | null;
  input?: readonly string[] | null;
  output?: readonly string[] | null;
  contextWindow?: number | null;
  isDeprecated?: boolean | null;
  retiredAt?: string | null;
  maker?: string | null;
  /** Curated 1-6 rating; 6 is the top ("max") band. */
  costRating?: number | null;
  isPrimary?: boolean | null;
  isPremium?: boolean | null;
  releaseDate?: string | null;
}

export function isDebriefModel(m: DebriefModelRow, filter: DebriefModelFilter | null = null): boolean {
  if (m.isDeprecated || m.retiredAt) return false;
  if (/\bmock\b|no-cost test/i.test(m.name)) return false;
  if (filter && (m.contextWindow ?? 0) < filter.minContextTokens) return false;
  if (m.interaction !== "turn" && m.interaction !== "single") return false;
  if (!(m.input ?? []).includes("text")) return false;
  const out = m.output ?? [];
  return out.length > 0 && out.every((o) => o === "text");
}

export function debriefModelIds(models: readonly DebriefModelRow[], filter: DebriefModelFilter | null = null): string[] {
  return models.filter((m) => isDebriefModel(m, filter)).map((m) => m.id);
}

const family = (name: string) => name.replace(/\bmax\b/i, "").replace(/\s+/g, " ").trim().toLowerCase();
const time = (m: DebriefModelRow) => (m.releaseDate ? Date.parse(m.releaseDate) || 0 : 0);

/**
 * The short Debrief menu, derived from the catalog (never ids): among the models Debrief may read with, for each
 * maker with a headline model (primary, premium or top-rated, rated 4+), its strongest `modelsPerMaker` general
 * text/reasoning models (by rating, then newest) plus its top-band model when it has one (that row stays locked
 * for people the picker's own tier gate does not let use it). Specialist models are left to "More models...".
 */
export function curatedDebriefModelIds(models: readonly DebriefModelRow[], filter: DebriefModelFilter | null): string[] {
  if (!filter) return [];
  const { minStrongRating, modelsPerMaker, topRatingBand } = filter;
  let specialist: RegExp;
  try {
    specialist = new RegExp(filter.specialistPattern, "i");
  } catch {
    return []; // a pattern that is not a valid expression offers no short menu; the full list shows
  }
  const byMaker = new Map<string, DebriefModelRow[]>();
  for (const m of models) {
    if (!isDebriefModel(m, filter) || !m.maker || specialist.test(m.name)) continue;
    const rating = m.costRating ?? 0;
    if (rating < minStrongRating || !(m.isPrimary || m.isPremium || rating >= 5)) continue;
    byMaker.set(m.maker, [...(byMaker.get(m.maker) ?? []), m]);
  }
  const out: string[] = [];
  for (const rows of byMaker.values()) {
    const regular = rows.filter((m) => (m.costRating ?? 0) < topRatingBand)
      .sort((a, b) => (b.costRating ?? 0) - (a.costRating ?? 0) || time(b) - time(a));
    const picked: DebriefModelRow[] = [];
    for (const m of regular) {
      if (picked.length < modelsPerMaker && !picked.some((x) => family(x.name) === family(m.name))) picked.push(m);
    }
    const top = rows.filter((m) => (m.costRating ?? 0) >= topRatingBand && !picked.some((x) => family(x.name) === family(m.name)))
      .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary) || time(b) - time(a))[0];
    if (top) picked.push(top);
    out.push(...picked.sort((a, b) => time(b) - time(a)).map((m) => m.id));
  }
  return out;
}
