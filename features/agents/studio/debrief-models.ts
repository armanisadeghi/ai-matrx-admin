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
