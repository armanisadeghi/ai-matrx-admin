/**
 * Which models the Debrief may read a run with: the live catalog's text/chat models only.
 * Debrief reads a whole run and writes proposals, so a model must take text instructions, answer in
 * text only (no image / speech / video output), be a normal conversational turn model, still be served
 * (not deprecated, retired or deleted), have room to read a run, and not be the no-cost mock.
 * The picker's own tier gate still decides who may pick the top tier (locked rows stay locked).
 */

const MIN_CONTEXT_TO_READ_A_RUN = 32_000;

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

export function isDebriefModel(m: DebriefModelRow): boolean {
  if (m.isDeprecated || m.retiredAt) return false;
  if (/\bmock\b|no-cost test/i.test(m.name)) return false;
  if ((m.contextWindow ?? 0) < MIN_CONTEXT_TO_READ_A_RUN) return false;
  if (m.interaction !== "turn" && m.interaction !== "single") return false;
  if (!(m.input ?? []).includes("text")) return false;
  const out = m.output ?? [];
  return out.length > 0 && out.every((o) => o === "text");
}

export function debriefModelIds(models: readonly DebriefModelRow[]): string[] {
  return models.filter(isDebriefModel).map((m) => m.id);
}

/** Purpose-built models that read text but are not general reasoning models (live voice, robotics, research agents, code, safety, speech). */
const SPECIALIST = /robot|\blive\b|translate|deep research|codex|safety|guard|tts|realtime|embedding|image|\bcoder?\b|\bsearch\b/i;
const MIN_STRONG_RATING = 4;
const TOP_BAND = 6;
const PER_MAKER = 2;

const family = (name: string) => name.replace(/\bmax\b/i, "").replace(/\s+/g, " ").trim().toLowerCase();
const time = (m: DebriefModelRow) => (m.releaseDate ? Date.parse(m.releaseDate) || 0 : 0);

/**
 * The short Debrief menu, derived from the catalog (never ids): among the models Debrief may read with, for each
 * maker with a headline model (primary, premium or top-rated, rated 4+), its strongest {@link PER_MAKER} general
 * text/reasoning models (by rating, then newest) plus its top-band model when it has one (that row stays locked
 * for people the picker's own tier gate does not let use it). Specialist models are left to "More models...".
 */
export function curatedDebriefModelIds(models: readonly DebriefModelRow[]): string[] {
  const byMaker = new Map<string, DebriefModelRow[]>();
  for (const m of models) {
    if (!isDebriefModel(m) || !m.maker || SPECIALIST.test(m.name)) continue;
    const rating = m.costRating ?? 0;
    if (rating < MIN_STRONG_RATING || !(m.isPrimary || m.isPremium || rating >= 5)) continue;
    byMaker.set(m.maker, [...(byMaker.get(m.maker) ?? []), m]);
  }
  const out: string[] = [];
  for (const rows of byMaker.values()) {
    const regular = rows.filter((m) => (m.costRating ?? 0) < TOP_BAND)
      .sort((a, b) => (b.costRating ?? 0) - (a.costRating ?? 0) || time(b) - time(a));
    const picked: DebriefModelRow[] = [];
    for (const m of regular) {
      if (picked.length < PER_MAKER && !picked.some((x) => family(x.name) === family(m.name))) picked.push(m);
    }
    const top = rows.filter((m) => (m.costRating ?? 0) >= TOP_BAND && !picked.some((x) => family(x.name) === family(m.name)))
      .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary) || time(b) - time(a))[0];
    if (top) picked.push(top);
    out.push(...picked.sort((a, b) => time(b) - time(a)).map((m) => m.id));
  }
  return out;
}
