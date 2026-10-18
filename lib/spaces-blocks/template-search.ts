// lib/spaces-blocks/template-search.ts — THE ONE TEMPLATE SEARCH: how a typed query finds Space templates.
//
// Used by the in-app Templates gallery (features/spaces/sidebar/TemplateGallery.tsx) and meant for the public
// /templates gallery too: pure, no React, no store, no feature import (this folder sits outside the Spaces fence).
//
// A person types the way they think ("to do list", "kanban", "meeting notes"), not the way a card is titled
// (ADVERSARIAL-1 #1: a literal substring over title + description found 0 for "to do list", 1 for "kanban").
// So the query is cut into words, each word is a CONCEPT that matches any of its synonyms, and a card is
// matched over every field a person could mean:
//   title · tags · category label · description · who it is for · what is INSIDE it (`find`: table names,
//   view names and layouts like kanban/board/calendar/timeline/gallery, page titles — `packFindWords`).
// Every concept must match (AND); when no card matches every concept, cards matching any of them are
// answered instead (OR), most concepts first. Ranked by where each concept matched (title > tags >
// category > description > for-who > contents), the person's own word above a synonym.
//
// Usage:
//   searchTemplates(cards, query, (c) => c.space)           → the matching cards, best first ("" → all, in order)
//   packFindWords(pack)                                      → the `find` words a card face carries (packCardFace)

import { SPACE_TEMPLATE_CATEGORIES } from "./template-pack";

/** The fields a template search reads. `find` is what is inside the template (packFindWords). */
export interface TemplateSearchFace {
  title: string;
  description?: string | null;
  forWho?: string | null;
  category?: string | null;
  tags?: readonly string[] | null;
  find?: readonly string[] | null;
}

/**
 * Words that mean the same thing to a person looking for a template. Each group is one concept; a query word in
 * a group matches every word of the group (exactly — only the person's own word also matches as a prefix).
 * Words are written stemmed (see `stem`): "sale", not "sales".
 */
export const TEMPLATE_SYNONYMS: readonly (readonly string[])[] = [
  ["todo", "task", "checklist", "chore", "errand"],
  ["kanban", "board"],
  ["crm", "client", "customer", "lead", "contact", "deal", "account"],
  ["sale", "pipeline", "deal", "prospect"],
  ["calendar", "schedule", "planner", "agenda", "scheduling"],
  ["budget", "expense", "finance", "spending", "money", "cost", "bookkeeping"],
  ["invoice", "invoicing", "billing", "bill", "payment"],
  ["note", "doc", "wiki", "knowledge", "documentation", "handbook"],
  ["meeting", "standup", "agenda", "oneonone"],
  ["habit", "routine", "streak"],
  ["recipe", "meal", "cooking", "food", "kitchen"],
  ["journal", "diary", "reflection", "gratitude"],
  ["roadmap", "milestone", "release", "launch"],
  ["portal", "hub"],
  ["project", "projects"],
  ["goal", "okr", "objective"],
  ["content", "editorial", "post", "social"],
  ["hiring", "recruiting", "applicant", "candidate", "recruitment"],
  ["student", "school", "class", "course", "study"],
  ["workout", "fitness", "exercise", "gym"],
  ["travel", "trip", "itinerary", "vacation"],
  ["bug", "issue", "ticket"],
];

/** Typed phrases folded to one word before the query is cut ("to do" → "todo"). */
const PHRASES: ReadonlyArray<[RegExp, string]> = [
  [/\bto[\s-]+dos?\b/g, "todo"],
  [/\b1\s*[:-]?\s*on\s*[:-]?\s*1\b|\b1:1\b|\bone[\s-]+on[\s-]+one\b/g, "oneonone"],
  [/\bstand[\s-]+ups?\b/g, "standup"],
];

/** Words that carry no meaning in a template search. */
const STOP = new Set(["a", "an", "the", "for", "my", "of", "and", "to", "in", "with", "on", "template", "page", "free", "notion", "app"]);
/** Words that rank when they match but never exclude a card ("habit tracker" finds a "Habits" pack). */
const SOFT = new Set(["list", "tracker", "track", "tracking", "manager", "management", "system", "os", "simple", "basic", "ultimate", "dashboard", "log", "plan", "planning", "organizer"]);

/** Field weights: where a concept matched. */
const WEIGHT = { title: 10, tags: 7, category: 5, description: 4, forWho: 3, find: 2 } as const;
type Field = keyof typeof WEIGHT;
/** A synonym's match counts for this share of the person's own word. */
const SYNONYM_SHARE = 0.6;

/** Lower case, accents off, cut into words. */
export function searchWords(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** A light English stem, applied to both sides: plurals off ("recipes" → "recipe", "categories" → "category"). */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && /(ss|x|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
  return w;
}

const GROUPS_OF = (() => {
  const m = new Map<string, Set<string>>();
  for (const g of TEMPLATE_SYNONYMS)
    for (const w of g) {
      const set = m.get(w) ?? new Set<string>();
      for (const x of g) if (x !== w) set.add(x);
      m.set(w, set);
    }
  return m;
})();

interface Concept {
  word: string;
  synonyms: Set<string>;
  soft: boolean;
}

/** The query as concepts (each typed word with its synonyms). */
export function queryConcepts(query: string): Concept[] {
  let q = query.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  for (const [re, to] of PHRASES) q = q.replace(re, to);
  const seen = new Set<string>();
  const out: Concept[] = [];
  for (const raw of searchWords(q)) {
    if (STOP.has(raw)) continue;
    const word = stem(raw);
    if (seen.has(word)) continue;
    seen.add(word);
    out.push({ word, synonyms: GROUPS_OF.get(word) ?? new Set(), soft: SOFT.has(raw) || SOFT.has(word) });
  }
  return out;
}

const categoryLabel = (key: string | null | undefined) => SPACE_TEMPLATE_CATEGORIES.find((c) => c.key === key)?.label ?? key ?? "";

/** Typed phrases folded the same way on the card side ("Personal To-Do List" holds "todo"). */
function foldPhrases(s: string | null | undefined): string {
  let out = (s ?? "").toLowerCase();
  for (const [re, to] of PHRASES) out = out.replace(re, (m) => `${m} ${to}`);
  return out;
}

function faceWords(face: TemplateSearchFace): Record<Field, string[]> {
  const of = (s: string | null | undefined) => searchWords(foldPhrases(s)).map(stem);
  return {
    title: of(face.title),
    tags: (face.tags ?? []).flatMap((t) => of(t)),
    category: of(categoryLabel(face.category)),
    description: of(face.description),
    forWho: of(face.forWho),
    find: (face.find ?? []).flatMap((t) => of(t)),
  };
}

/** How well one concept matches a word list: 1 own word, SYNONYM_SHARE a synonym, 0 none. */
function conceptHit(c: Concept, words: string[]): number {
  let best = 0;
  for (const w of words) {
    if (w === c.word || (c.word.length >= 3 && w.startsWith(c.word))) return 1;
    if (c.synonyms.has(w)) best = SYNONYM_SHARE;
  }
  return best;
}

/** One card's score for the query: matched concepts (required ones) and the rank score. */
export function templateMatch(face: TemplateSearchFace, query: string): { matched: number; required: number; score: number } {
  return matchConcepts(faceWords(face), face.title, queryConcepts(query), query);
}

function matchConcepts(words: Record<Field, string[]>, title: string, concepts: Concept[], query: string) {
  let matched = 0;
  let score = 0;
  const hard = concepts.filter((c) => !c.soft);
  for (const c of concepts) {
    let best = 0;
    for (const f of Object.keys(WEIGHT) as Field[]) best = Math.max(best, WEIGHT[f] * conceptHit(c, words[f]));
    if (best > 0 && !c.soft) matched++;
    score += c.soft ? best / 2 : best;
  }
  // The whole typed phrase inside the title: the card the person is naming.
  const phrase = searchWords(query).join(" ");
  const titled = searchWords(title).join(" ");
  if (phrase && titled.includes(phrase)) score += titled.startsWith(phrase) ? 12 : 8;
  return { matched, required: hard.length, score };
}

/**
 * The items matching `query`, best first. An empty query answers every item in its own order. Every concept of
 * the query must match; when no item matches all of them, items matching any are answered, most concepts first.
 */
export function searchTemplates<T>(items: readonly T[], query: string, faceOf: (item: T) => TemplateSearchFace): T[] {
  const concepts = queryConcepts(query);
  if (!concepts.length) return [...items];
  const hardCount = concepts.filter((c) => !c.soft).length;
  const scored = items.map((item, i) => {
    const face = faceOf(item);
    return { item, i, ...matchConcepts(faceWords(face), face.title, concepts, query) };
  });
  // Only soft words typed ("list"): any card they match.
  const passes = (s: (typeof scored)[number]) => (hardCount ? s.matched === hardCount : s.score > 0);
  let hits = scored.filter(passes);
  if (!hits.length && hardCount > 1) hits = scored.filter((s) => s.matched > 0);
  return hits.sort((a, b) => b.matched - a.matched || b.score - a.score || a.i - b.i).map((s) => s.item);
}

// ── What is inside a pack: the `find` words its card carries ───────────────────────────────────────────────

/** The words a view layout is searched by. */
const LAYOUT_WORDS: Record<string, string[]> = {
  kanban: ["kanban", "board"],
  board: ["kanban", "board"],
  calendar: ["calendar"],
  timeline: ["timeline", "gantt"],
  gallery: ["gallery"],
  chart: ["chart"],
  form: ["form"],
};

interface FindPack {
  spec: { tables?: Array<{ name?: string }>; views?: Array<{ name?: string; kind?: string }> };
  pages: Array<{ title: string; blocks: unknown[] }>;
}

/**
 * The searchable words of what is inside a pack: table names, view names and layouts (spec views and every
 * database block's own views), and page titles. Unique, lower case, in first-seen order.
 */
export function packFindWords(pack: FindPack): string[] {
  const out = new Set<string>();
  const add = (s: string | undefined | null) => searchWords(s).forEach((w) => w.length > 1 && !STOP.has(w) && out.add(w));
  const layout = (k: string | undefined) => (k ? (LAYOUT_WORDS[k] ?? []).forEach((w) => out.add(w)) : undefined);
  for (const t of pack.spec.tables ?? []) add(t.name);
  for (const v of pack.spec.views ?? []) {
    add(v.name);
    layout(v.kind);
  }
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const b = node as { type?: string; props?: { title?: string; views?: Array<{ name?: string; layout?: string }> }; children?: unknown };
    if (b.type === "database") {
      add(b.props?.title);
      for (const v of b.props?.views ?? []) {
        add(v.name);
        layout(v.layout);
      }
    }
    if (b.children) walk(b.children);
  };
  for (const p of pack.pages) {
    add(p.title);
    walk(p.blocks);
  }
  return [...out];
}
