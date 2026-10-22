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
//   and the template's own TEXT (`body`: page prose and the sample business it is written for — packBodyWords),
//   where only the person's own word counts (never a synonym: prose is broad).
// Cards matching EVERY concept come first, then cards matching some of them, most concepts first: a search
// that matches any word is never empty (ADVERSARIAL-3 D5: "church volunteers" dropped Volunteer Program Desk,
// "SaaS roadmap" dropped Product Roadmap). Within each, ranked by where each concept matched (title > tags >
// category > description > for-who > contents > text), the person's own word above a synonym.
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
  /**
   * The layouts its database blocks OPEN on (the view a person sees first), main first: the root page's first
   * database block leads (`packLayouts`). A layout query ("kanban", "calendar") matches these, never the
   * install plan's spare views — every table carries a board there, so "kanban" used to match all 172 (ADVERSARIAL-2 #3).
   */
  layouts?: readonly string[] | null;
  /** The template's own text, space-separated words (page prose, the sample business): packBodyWords. Own words only. */
  body?: string | null;
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
  // Trades, practices and shops: the person names their job or business, the card names its work
  // (ADVERSARIAL-2 #3: "plumber" and "accountant" found 0 while Plumbing Company HQ and Accounting Firm Desk exist).
  ["plumber", "plumbing"],
  ["accountant", "accounting", "accountancy", "bookkeeper", "bookkeeping", "cpa", "tax"],
  ["lawyer", "attorney", "law", "legal", "paralegal", "litigation"],
  ["realtor", "realestate", "realty", "brokerage"],
  ["dentist", "dental", "dentistry", "orthodontist", "orthodontic"],
  ["salon", "stylist", "hair", "hairdresser", "barber", "barbershop", "beauty", "nail"],
  ["spa", "massage", "esthetician", "facial"],
  ["restaurant", "cafe", "coffee", "catering", "caterer", "bakery", "brewery", "diner", "bistro", "foodtruck"],
  ["doctor", "clinic", "medical", "physician", "healthcare", "patient"],
  ["therapist", "therapy", "counselor", "counseling", "psychologist", "mentalhealth"],
  ["contractor", "construction", "remodel", "remodeling", "renovation"],
  ["electrician", "electrical"],
  ["landscaper", "landscaping", "lawn", "gardener", "gardening"],
  ["cleaner", "cleaning", "janitorial", "maid", "housekeeping"],
  ["photographer", "photography", "photo"],
  ["nonprofit", "charity", "donor", "fundraising"],
  ["teacher", "teaching", "tutor", "tutoring", "lesson", "classroom"],
  ["ecommerce", "shop", "store", "retail", "shopify"],
  ["veterinarian", "vet", "veterinary", "pet"],
  ["hotel", "hospitality", "lodging", "bnb", "inn"],
  ["consultant", "consulting", "consultancy"],
  ["freelancer", "freelance", "freelancing", "solopreneur"],
  ["roofer", "roofing"],
  ["mover", "moving"],
  ["church", "faith", "ministry", "congregation"],
  ["trainer", "fitness", "gym"],
  // ADVERSARIAL-3 D5: "freight" found nothing though the trucking desk is the freight template.
  ["trucking", "freight", "hauling", "carrier"],
  ["shipping", "shipment", "freight", "fulfillment"],
];

/**
 * One-way expansions for a BROAD industry word: typing the field ("logistics") finds every trade inside it, but typing
 * one trade ("freight") never widens to its neighbours (a symmetric group would make "freight" answer warehouses).
 * Without this, "logistics" matched only the category label "Manufacturing & logistics" and the cards there tied,
 * so a food kitchen outranked the trucking and warehouse desks (the "logistics finds…" test, 2026-10-22).
 */
const BROAD_TERMS: Readonly<Record<string, readonly string[]>> = {
  logistic: ["trucking", "freight", "warehouse", "courier", "delivery", "dispatch", "fleet", "shipping", "fulfillment", "3pl", "carrier"],
};

/** Typed phrases folded to one word before the query is cut ("to do" → "todo"). */
const PHRASES: ReadonlyArray<[RegExp, string]> = [
  [/\bto[\s-]+dos?\b/g, "todo"],
  [/\b1\s*[:-]?\s*on\s*[:-]?\s*1\b|\b1:1\b|\bone[\s-]+on[\s-]+one\b/g, "oneonone"],
  [/\bstand[\s-]+ups?\b/g, "standup"],
  [/\breal[\s-]+estate\b/g, "realestate"],
  [/\bfood[\s-]+trucks?\b/g, "foodtruck"],
  [/\bmental[\s-]+health\b/g, "mentalhealth"],
  [/\bnon[\s-]+profits?\b/g, "nonprofit"],
  [/\be[\s-]+commerce\b/g, "ecommerce"],
];

/** Words that carry no meaning in a template search. */
const STOP = new Set(["a", "an", "the", "for", "my", "of", "and", "to", "in", "with", "on", "template", "page", "free", "notion", "app"]);
/** Words that rank when they match but never exclude a card ("habit tracker" finds a "Habits" pack). */
const SOFT = new Set(["list", "tracker", "track", "tracking", "manager", "management", "system", "os", "simple", "basic", "ultimate", "dashboard", "log", "plan", "planning", "organizer", "business", "company", "firm", "hq", "office", "studio", "agency", "practice", "shop", "desk", "team", "small", "local", "workspace", "hub"]);

/** Field weights: where a concept matched. */
const WEIGHT = { title: 10, tags: 7, main: 6, category: 5, description: 4, forWho: 3, layout: 3, find: 2, body: 1 } as const;
type Field = keyof typeof WEIGHT;
/** Added when the template's main view is the layout a concept names (ADVERSARIAL-2 #3: main boards first). */
const MAIN_BONUS = 4;
/** A soft word's share of its field weight: alone it is the query; beside a meaningful word it is a tie-breaker. */
const SOFT_SHARE_ALONE = 0.5;
const SOFT_SHARE_WITH_HARD = 0.1;
/** A synonym's match counts for this share of the person's own word. */
const SYNONYM_SHARE = 0.6;
/** A form made from the person's own word ("plumber" → "plumbing") counts for this share. */
const FORM_SHARE = 0.9;
/** The person's own word also matches as a word start from this length ("invoic" → "invoices"; "law" never "lawn"). */
const PREFIX_FROM = 4;

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

for (const [word, members] of Object.entries(BROAD_TERMS)) {
  const set = GROUPS_OF.get(word) ?? new Set<string>();
  for (const m of members) set.add(m);
  GROUPS_OF.set(word, set);
}

interface Concept {
  word: string;
  synonyms: Set<string>;
  /** Forms of the person's own word: the work an agent noun names ("plumber" → "plumbing", "plumb…"). */
  forms: { exact: Set<string>; starts: string[] };
  soft: boolean;
}

/**
 * The work an agent noun names, so a job title finds its trade without a synonym listed for it:
 * "roofer" → "roofing", "landscaper" → "landscaping", "accountant" → "account…", "electrician" → "electric…",
 * "therapist" → "therap…". A root shorter than five letters only matches with "-ing" ("roof" never "roofline").
 */
export function agentNounForms(word: string): { exact: Set<string>; starts: string[] } {
  const exact = new Set<string>();
  const starts: string[] = [];
  if (word.length >= 6) {
    const root = /(?:er|or)$/.test(word) ? word.slice(0, -2) : /(?:ist|ian|ant)$/.test(word) ? word.slice(0, -3) : null;
    if (root && root.length >= 3) {
      exact.add(`${root}ing`);
      if (root.length >= 5) starts.push(root);
    }
  }
  return { exact, starts };
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
    out.push({ word, synonyms: GROUPS_OF.get(word) ?? new Set(), forms: agentNounForms(word), soft: SOFT.has(raw) || SOFT.has(word) });
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
  const layoutWords = (k: string | undefined) => (k ? (LAYOUT_WORDS[k] ?? []) : []);
  const layouts = face.layouts ?? null;
  // A card that names its opening layouts is searched by those for a layout word; its contents words keep
  // only the names (an older card, published before `layouts`, still matches layouts through `find`).
  const find = (face.find ?? []).flatMap((t) => of(t));
  return {
    main: layouts ? layoutWords(layouts[0]) : [],
    layout: layouts ? layouts.flatMap(layoutWords) : [],
    title: of(face.title),
    tags: (face.tags ?? []).flatMap((t) => of(t)),
    category: of(categoryLabel(face.category)),
    description: of(face.description),
    forWho: of(face.forWho),
    find: layouts ? find.filter((w) => !LAYOUT_WORD_SET.has(w)) : find,
    // Prose names layouts loosely ("the Jobs board"): a layout query reads `layouts`, never the text.
    body: of(face.body).filter((w) => !LAYOUT_WORD_SET.has(w)),
  };
}

/**
 * How well one concept matches a word list: 1 own word, FORM_SHARE a form of it, SYNONYM_SHARE a synonym, 0 none.
 * `ownOnly`: the category label is broad ("Fitness & wellness" holds the barbershop), so only the person's own word counts there.
 */
function conceptHit(c: Concept, words: string[], ownOnly = false): number {
  let best = 0;
  for (const w of words) {
    if (w === c.word || (c.word.length >= PREFIX_FROM && w.startsWith(c.word))) return 1;
    if (c.forms.exact.has(w) || c.forms.starts.some((r) => w.length > r.length && w.startsWith(r))) best = Math.max(best, FORM_SHARE);
    else if (!ownOnly && c.synonyms.has(w)) best = Math.max(best, SYNONYM_SHARE);
  }
  return best;
}

/** The template's own text is broad prose: only the person's exact word (stemmed) or its work form counts, never a prefix ("board" is not "boarding") or a synonym. */
function bodyHit(c: Concept, words: string[]): number {
  for (const w of words) if (w === c.word) return 1;
  return words.some((w) => c.forms.exact.has(w)) ? FORM_SHARE : 0;
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
    for (const f of Object.keys(WEIGHT) as Field[]) best = Math.max(best, WEIGHT[f] * (f === "body" ? bodyHit(c, words.body) : conceptHit(c, words[f], f === "category")));
    // A template whose MAIN view is the layout asked for ranks above one that only names it (a "kanban" tag).
    if (best > 0) best += MAIN_BONUS * conceptHit(c, words.main);
    if (best > 0 && !c.soft) matched++;
    // A generic business word ("company", "office", "hq") only breaks ties once a meaningful word is typed: every
    // title carries one, so at half weight "logistics company" ranked Plumbing Company HQ first.
    score += c.soft ? best * (hard.length ? SOFT_SHARE_WITH_HARD : SOFT_SHARE_ALONE) : best;
  }
  // The whole typed phrase inside the title: the card the person is naming.
  const phrase = searchWords(query).join(" ");
  const titled = searchWords(title).join(" ");
  if (phrase && titled.includes(phrase)) score += titled.startsWith(phrase) ? 12 : 8;
  return { matched, required: hard.length, score };
}

/**
 * The items matching `query`, best first. An empty query answers every item in its own order. Items matching every
 * concept of the query lead; items matching some follow, most concepts first — never empty when any word matches.
 */
export function searchTemplates<T>(items: readonly T[], query: string, faceOf: (item: T) => TemplateSearchFace): T[] {
  const concepts = queryConcepts(query);
  if (!concepts.length) return [...items];
  const hardCount = concepts.filter((c) => !c.soft).length;
  const scored = items.map((item, i) => {
    const face = faceOf(item);
    return { item, i, ...matchConcepts(faceWords(face), face.title, concepts, query) };
  });
  // Only soft words typed ("list"): any card they match. Otherwise any card matching a meaningful word, all-words first.
  let hits = scored.filter((s) => (hardCount ? s.matched > 0 : s.score > 0));
  // ADVERSARIAL-6 F5: A NAMED COLLECTION IS THE ANSWER. When two or more cards carry the whole typed phrase in their title
  // or as one of their tags ("design system": the ten starters, the board and the docs), those cards ARE what was asked:
  // the count says them, not the 36 that mention "design" somewhere ("36 of 183" while 12 led). One card naming the
  // phrase ("to do list") leads a broad answer instead, as before.
  const named = namedBy(query, scored.map((s) => faceOf(s.item)));
  if (named.size >= 2) hits = hits.filter((s) => named.has(s.i));
  return hits.sort((a, b) => b.matched - a.matched || b.score - a.score || a.i - b.i).map((s) => s.item);
}

/** The places (indexes) of the faces whose title holds the whole multi-word phrase, or whose tag is exactly it. */
function namedBy(query: string, faces: readonly TemplateSearchFace[]): Set<number> {
  const phrase = searchWords(foldPhrases(query)).map(stem).join(" ");
  const out = new Set<number>();
  if (!phrase.includes(" ")) return out;
  faces.forEach((f, i) => {
    const words = (s: string | null | undefined) => ` ${searchWords(foldPhrases(s)).map(stem).join(" ")} `;
    if (words(f.title).includes(` ${phrase} `) || (f.tags ?? []).some((t) => words(t).trim() === phrase)) out.add(i);
  });
  return out;
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
const LAYOUT_WORD_SET = new Set(Object.values(LAYOUT_WORDS).flat());

interface FindPack {
  spec: {
    tables?: Array<{ name?: string }>;
    views?: Array<{ name?: string; kind?: string }>;
    useCase?: string | null;
    vertical?: string | null;
    business?: { name?: string | null; describes?: string | null } | null;
  };
  pages: Array<{ title: string; blocks: unknown[] }>;
}

/** Words too common in template prose to tell one template from another (kept off `body` to keep the card light). */
const BODY_COMMON = new Set(
  ("this what with every that each from your when uses next before first week open check keep they them their which time " +
    "date write days three after small then anything where only than same start note move read person have will into there " +
    "here about more also been were being would could should while until through other some most much many such just like " +
    "over under down back still even make made makes need needs want goes going come comes know shows show shown look looks " +
    "takes take give gives used using does done doing tells tell left right last ones once both either because without within " +
    "between again always never often sometimes usually well good better best very really page pages table tables view views " +
    "row rows column columns block blocks click press type typed").split(" "),
);

/** Collects every text run of a block tree (`text` / `content` as a string or inline runs), children included. */
function blockTexts(node: unknown, out: string[]): void {
  if (Array.isArray(node)) return node.forEach((n) => blockTexts(n, out));
  if (typeof node === "string") return void out.push(node);
  if (!node || typeof node !== "object") return;
  const b = node as { text?: unknown; content?: unknown; children?: unknown; rows?: unknown; cells?: unknown };
  for (const v of [b.text, b.content, b.rows, b.cells, b.children]) if (v) blockTexts(v, out);
}

/**
 * THE TEMPLATE'S OWN TEXT, as search words (`body` on the card face): its pages' prose and the sample business it is
 * written for (use case, vertical, business name and description) — "freight" finds the trucking desk whose sample
 * carrier is a freight line. Words of three letters or more, minus stop words, numbers and the `find` words already
 * carried; four letters or more, minus words common to all template prose (BODY_COMMON); unique by stem,
 * space-separated (one string keeps the card light).
 */
export function packBodyWords(pack: FindPack): string {
  const texts: string[] = [];
  for (const p of pack.pages) blockTexts(p.blocks, texts);
  const b = pack.spec.business;
  texts.push(pack.spec.useCase ?? "", pack.spec.vertical ?? "", b?.name ?? "", b?.describes ?? "");
  const skip = new Set(packFindWords(pack).map(stem));
  const out = new Map<string, string>();
  for (const w of searchWords(texts.join(" "))) {
    if (w.length < 4 || BODY_COMMON.has(w) || /^\d+$/.test(w)) continue;
    const k = stem(w);
    if (!skip.has(k) && !out.has(k)) out.set(k, w);
  }
  return [...out.values()].join(" ");
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
  // The install plan's views are names only: every table carries a spare board there (ADVERSARIAL-2 #3).
  for (const v of pack.spec.views ?? []) add(v.name);
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const b = node as { type?: string; props?: { title?: string; views?: Array<{ name?: string; layout?: string }> }; children?: unknown };
    if (b.type === "database") {
      add(b.props?.title);
      for (const v of b.props?.views ?? []) add(v.name);
      // The layout a person sees when the block opens (its first view).
      layout(b.props?.views?.[0]?.layout);
    }
    if (b.children) walk(b.children);
  };
  for (const p of pack.pages) {
    add(p.title);
    walk(p.blocks);
  }
  return [...out];
}

/**
 * The layouts a pack's database blocks open on, main first: pages in order (the root page first), each
 * database block's first view, unique ("board" folded into "kanban"). `layouts[0]` is the template's main view.
 */
export function packLayouts(pack: FindPack): string[] {
  const out = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const b = node as { type?: string; props?: { views?: Array<{ layout?: string }> }; children?: unknown };
    if (b.type === "database") {
      const first = b.props?.views?.[0]?.layout ?? "grid";
      out.add(first === "board" ? "kanban" : first);
    }
    if (b.children) walk(b.children);
  };
  for (const p of pack.pages) walk(p.blocks);
  return [...out];
}

/**
 * The count a gallery says beside a search: "12 of 183" while a query is typed, the plain total when not. It is built from the
 * very list `searchTemplates` returned, so the number on screen can never disagree with the cards shown.
 */
export function templateResultCount(query: string, shown: number, total: number): string {
  return query.trim() ? `${shown} of ${total}` : String(total);
}
