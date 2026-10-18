/**
 * Does one of the person's existing agents really do a step's job? A suggestion, never a decision:
 * the person confirms it, and nothing is marked Ready on a weak fit. The score is the share of the
 * step's distinctive words (its title weighs double) that the agent's own name and description say.
 * A generic "Project assistant" shares none of a "Medical Fact-Checker" step's words, so it scores 0.
 */

export interface MatchableAgent {
  id: string;
  name: string | null;
  description?: string | null;
  category?: string | null;
  tags?: readonly string[] | null;
  isArchived?: boolean;
}

export type MatchConfidence = "strong" | "possible";

export interface StepMatch {
  agentId: string;
  agentName: string;
  /** 0..1 */
  score: number;
  /** The shared words, for "why". */
  shared: string[];
  confidence: MatchConfidence;
}

/** Words that appear in almost every step or agent and prove nothing about fit. */
const GENERIC = new Set(
  (
    "a an the and or of to for in on with from by as at is are be this that it its into your you their " +
    "step agent agents assistant assistants helper bot project general ai model models call calls tool tools " +
    "write writes writer make makes build builds create creates check checks checking run runs use uses using " +
    "review reviews send sends get gets give gives take takes do does done one two new each every all any " +
    "single simple basic main core default custom personal team work works job task tasks"
  ).split(" "),
);

function stem(w: string): string {
  return w.replace(/(ing|ers|er|ed|es|s|ion|ly)$/, (m) => (w.length - m.length >= 4 ? "" : m));
}

export function keywords(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || GENERIC.has(raw)) continue;
    const s = stem(raw);
    if (s.length >= 3 && !GENERIC.has(s)) out.add(s);
  }
  return [...out];
}

export const STRONG_AT = 0.6;
export const POSSIBLE_AT = 0.34;

function stepWords(step: { title: string; job?: string; summary?: string }) {
  const titleWords = keywords(step.title);
  const jobWords = keywords(`${step.summary ?? ""} ${step.job ?? ""}`).filter((w) => !titleWords.includes(w)).slice(0, 14);
  return { titleWords, jobWords, total: titleWords.length * 2 + jobWords.length * 0.5 };
}

function scoreOne(w: ReturnType<typeof stepWords>, a: MatchableAgent): { score: number; shared: string[] } {
  const own = new Set(keywords(`${a.name ?? ""} ${a.name ?? ""} ${a.description ?? ""} ${a.category ?? ""} ${(a.tags ?? []).join(" ")}`));
  const nameWords = new Set(keywords(a.name ?? ""));
  const shared: string[] = [];
  let got = 0;
  for (const t of w.titleWords) {
    if (own.has(t)) {
      got += nameWords.has(t) ? 2 : 1.6;
      shared.push(t);
    }
  }
  for (const j of w.jobWords) if (own.has(j)) got += 0.5;
  return { score: w.total > 0 ? Math.min(1, got / w.total) : 0, shared };
}

function confidenceOf(w: ReturnType<typeof stepWords>, r: { score: number; shared: string[] }): MatchConfidence | null {
  // Fit needs the step's own title words, not just its incidental ones.
  const needTitleHits = w.titleWords.length >= 2 ? 2 : 1;
  if (r.shared.length < needTitleHits) return null;
  return r.score >= STRONG_AT ? "strong" : r.score >= POSSIBLE_AT ? "possible" : null;
}

/** How well one specific agent fits a step, 0..1 (for an agent that was put on the step earlier). */
export function fitScore(step: { title: string; job?: string; summary?: string }, agent: MatchableAgent): number {
  const w = stepWords(step);
  const r = scoreOne(w, agent);
  return confidenceOf(w, r) ? r.score : Math.min(r.score, POSSIBLE_AT - 0.01);
}

export function matchStep(
  step: { title: string; job?: string; summary?: string },
  agents: readonly MatchableAgent[],
): StepMatch | null {
  const w = stepWords(step);
  if (w.titleWords.length === 0) return null;
  let best: StepMatch | null = null;
  for (const a of agents) {
    if (a.isArchived || !a.name?.trim()) continue;
    const r = scoreOne(w, a);
    const confidence = confidenceOf(w, r);
    if (!confidence) continue;
    if (!best || r.score > best.score) best = { agentId: a.id, agentName: a.name.trim(), score: r.score, shared: r.shared, confidence };
  }
  return best;
}

export function confidenceLabel(m: Pick<StepMatch, "confidence" | "score">): string {
  return `${m.confidence === "strong" ? "Strong match" : "Possible match"} · ${Math.round(m.score * 100)}%`;
}
