/**
 * The server's name-strength record (aidream services/brand_intake/name_strength.py), as each name search step
 * stores it in its output (`name_strength`): the verdict on the name, and the keyword the search actually sent.
 * Report 2026-10-15: a weak name ("Sarah") is never searched alone. The screen only READS this — the rules live
 * once, on the server.
 */

/** The steps whose output carries `name_strength` (aidream workflow smart_add_brand_identify_v1 node ids). */
export const NAME_SEARCH_STEPS = ["web", "deep", "enrich", "local", "person_anchor_search"] as const;
export type NameSearchStep = (typeof NAME_SEARCH_STEPS)[number];

export interface NameStrength {
  name: string;
  cleaned: string;
  kind: "full_name" | "brand_name" | "display_name";
  strength: "strong" | "usable_with_anchor" | "weak";
  reasons: string[];
  /** The keyword the search sent; null = not searched (weak name, nothing anchors it). */
  term: string | null;
  anchor: string | null;
  why: string;
  /** The screen should offer the small "Full name?" field. */
  fullNameAsked: boolean;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** One step output's `name_strength`, or null when it carries none. */
export function parseNameStrength(output: unknown): NameStrength | null {
  const ns = rec(rec(output).name_strength);
  const verdict = rec(ns.verdict);
  const keyword = rec(ns.keyword);
  if (typeof verdict.strength !== "string") return null;
  const kind = verdict.kind === "full_name" || verdict.kind === "brand_name" ? verdict.kind : "display_name";
  const strength = verdict.strength === "strong" || verdict.strength === "usable_with_anchor" ? verdict.strength : "weak";
  return {
    name: typeof verdict.name === "string" ? verdict.name : "",
    cleaned: typeof verdict.cleaned === "string" ? verdict.cleaned : "",
    kind,
    strength,
    reasons: Array.isArray(verdict.reasons) ? verdict.reasons.filter((r): r is string => typeof r === "string") : [],
    term: typeof keyword.term === "string" ? keyword.term : null,
    anchor: typeof keyword.anchor === "string" ? keyword.anchor : null,
    why: typeof keyword.why === "string" ? keyword.why : "",
    fullNameAsked: ns.full_name_asked === true,
  };
}

/** The name searches one run made: per step, the verdict, its keyword and every query the step sent. */
export interface NameSearchRow {
  step: string;
  strength: NameStrength;
  queries: string[];
}

export function nameSearchRows(outcomes: { nodeId: string; output: unknown }[]): NameSearchRow[] {
  const rows: NameSearchRow[] = [];
  for (const step of NAME_SEARCH_STEPS) {
    const o = outcomes.find((x) => x.nodeId === step);
    const strength = o ? parseNameStrength(o.output) : null;
    if (!o || !strength) continue;
    const raw = rec(o.output).queries;
    const queries = Array.isArray(raw)
      ? raw.map((q) => (typeof q === "string" ? q : typeof rec(q).query === "string" ? (rec(q).query as string) : "")).filter(Boolean)
      : [];
    rows.push({ step, strength, queries });
  }
  return rows;
}
