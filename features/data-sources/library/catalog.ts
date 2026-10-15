/**
 * The Data library — pure: the rich catalog the library page shows (`GET /data-sources`), read so it
 * works on today's answer AND the richer one the server lane is adding (groups with counts, subgroup,
 * description, output fields, featured, live-confirmed, known issue, per-source points). Every field
 * the server has not sent yet degrades to something honest: no output fields → no chips; no featured
 * flags → the confirmed sources are the featured shelf; no per-source points → the source's own USD
 * price at the organization's rate. Each source's OWN price is used — never a flat number.
 *
 * Network: `./server.ts`. The fetch itself reuses `../server.ts` + `../runs.ts` (the board's flow).
 */

import { usdToPoints } from "@ai-matrx/kit/format";

import { discoverOptionsOf, resolvePrice, urlPatternOf, type DataLimit, type DataSource, type DataSourceField, type DataSourceInputKind } from "../contract";

export interface LibrarySource extends DataSource {
  subgroup: string | null;
  description: string | null;
  /** The record fields a fetch brings back (column names), in the server's order. */
  outputFields: string[];
  featured: boolean;
  /** A live fetch has proven it (the server's `verified_live`, else its `verified`). */
  confirmed: boolean;
  /** A short, person-facing note when the source currently misbehaves. */
  knownIssue: string | null;
  /** The server's own per-record points price, when it sends one. */
  pointsPerRecord: number | null;
}

export interface LibraryGroup {
  group: string;
  count: number;
}

export interface Library {
  sources: LibrarySource[];
  groups: LibraryGroup[];
  limits: { max_records_per_fetch: DataLimit | null; max_inputs_per_fetch: DataLimit | null };
  /** True when the server marked featured sources itself (else the confirmed ones stand in). */
  serverFeatured: boolean;
}

// ─── parsing (the wire is untrusted) ─────────────────────────────────────────

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function limitOf(v: unknown): DataLimit | null {
  const o = obj(v);
  const value = num(o.value);
  const setting = str(o.setting);
  return value != null && setting ? { value, setting } : null;
}

const ACRONYMS = new Set(["id", "url", "urls", "sku", "gtin", "asin", "upc", "isbn", "ceo", "vin", "cb", "seo", "api", "ip", "usd"]);

/** "review_id" → "Review ID"; "cb_rank" → "CB rank"; a label the server sent wins. */
export function fieldWords(name: string): string {
  const words = name.replace(/[_.-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return name;
  const cased = words.map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w));
  if (!ACRONYMS.has(words[0])) cased[0] = cased[0][0].toUpperCase() + cased[0].slice(1);
  return cased.join(" ");
}

function outputFieldsOf(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const f of v) {
    const label = typeof f === "string" ? fieldWords(f) : str(obj(f).label) ?? (str(obj(f).name) ? fieldWords(str(obj(f).name)!) : null);
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

function knownIssueOf(v: unknown): string | null {
  if (typeof v === "string") return str(v);
  const o = obj(v);
  return str(o.summary) ?? str(o.message) ?? str(o.label) ?? str(o.text);
}

function inputOf(raw: unknown, exampleUrl: string | null): DataSource["input"] {
  const input = obj(raw);
  const mode = str(input.kind) ?? str(input.mode);
  const kind: DataSourceInputKind = mode === "keyword" || mode === "discover" ? "keyword" : "url";
  const fields = (Array.isArray(input.fields) ? input.fields : []).flatMap((f): DataSourceField[] => {
    const r = obj(f);
    const name = str(r.name);
    if (!name) return [];
    return [{ name, label: str(r.label) ?? fieldWords(name), required: r.required === true, example: str(r.example), type: str(r.type) }];
  });
  return {
    kind,
    fields: kind === "url" && fields.length === 0 ? [{ name: "url", label: "Page address", required: true, example: exampleUrl, type: "url" }] : fields,
    discover_options: discoverOptionsOf(input.discover_options),
  };
}

export function parseLibrary(raw: unknown): Library {
  const o = obj(raw);
  const list = Array.isArray(o.sources) ? o.sources : [];
  const sources: LibrarySource[] = [];
  const seen = new Set<string>();
  let anyFeatured = false;
  for (const item of list) {
    const s = obj(item);
    const key = str(s.key);
    const label = str(s.label);
    if (!key || !label || seen.has(key)) continue;
    seen.add(key);
    const exampleUrl = str(s.example_url);
    const verified = s.verified === true || s.verified_live === true;
    const featured = s.featured === true;
    if ("featured" in s) anyFeatured = anyFeatured || featured;
    const price = resolvePrice(s, o);
    sources.push({
      key,
      label,
      group: str(s.group) ?? "More sources",
      subgroup: str(s.subgroup),
      description: str(s.description),
      input: inputOf(s.input, exampleUrl),
      example_url: exampleUrl,
      url_pattern: urlPatternOf(s.url_pattern),
      verified,
      usd_per_record: price.usd,
      points_per_record: price.points,
      outputFields: outputFieldsOf(s.output_fields),
      featured,
      confirmed: typeof s.verified_live === "boolean" ? s.verified_live : s.verified === true,
      knownIssue: knownIssueOf(s.known_issue),
      pointsPerRecord: price.points,
    });
  }
  // No featured flags from the server yet: the confirmed sources are the shelf.
  if (!anyFeatured) for (const s of sources) s.featured = s.confirmed && !s.knownIssue;

  const groups = parseGroups(o.groups) ?? countGroups(sources);
  const limits = obj(o.limits);
  return {
    sources,
    groups,
    limits: { max_records_per_fetch: limitOf(limits.max_records_per_fetch), max_inputs_per_fetch: limitOf(limits.max_inputs_per_fetch) },
    serverFeatured: anyFeatured,
  };
}

function parseGroups(v: unknown): LibraryGroup[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out = v.flatMap((g): LibraryGroup[] => {
    const r = obj(g);
    const group = str(r.group) ?? str(r.name);
    const count = num(r.count);
    return group && count != null ? [{ group, count }] : [];
  });
  return out.length ? out : null;
}

/** Groups in first-seen order with their counts. */
export function countGroups(sources: readonly LibrarySource[]): LibraryGroup[] {
  const out: LibraryGroup[] = [];
  for (const s of sources) {
    const g = out.find((x) => x.group === s.group);
    if (g) g.count += 1;
    else out.push({ group: s.group, count: 1 });
  }
  return out;
}

// ─── price ───────────────────────────────────────────────────────────────────

/** Points for ONE record of this source: its own points price, else its USD price at `rate`. */
export function pointsPerRecord(source: Pick<LibrarySource, "pointsPerRecord" | "usd_per_record">, rate: number | null): number | null {
  if (source.pointsPerRecord != null && source.pointsPerRecord >= 0) return source.pointsPerRecord;
  if (source.usd_per_record == null || rate == null) return null;
  return usdToPoints(source.usd_per_record, { rate });
}

/** Points for `n` records (rounded up, like the server); null when the source is unpriced. */
export function pointsFor(source: Pick<LibrarySource, "pointsPerRecord" | "usd_per_record">, n: number, rate: number | null): number | null {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (source.pointsPerRecord != null && source.pointsPerRecord >= 0) return Math.ceil(Number((source.pointsPerRecord * n).toFixed(6)));
  if (source.usd_per_record == null || rate == null) return null;
  return usdToPoints(source.usd_per_record * n, { rate });
}

/** The cheapest per-record price in the library (the hero's "from N points a record"). */
export function cheapestPoints(sources: readonly LibrarySource[], rate: number | null): number | null {
  let min: number | null = null;
  for (const s of sources) {
    const p = pointsPerRecord(s, rate);
    if (p != null && p > 0 && (min == null || p < min)) min = p;
  }
  return min;
}

// ─── search and shelves ──────────────────────────────────────────────────────

function haystack(s: LibrarySource): string {
  return `${s.label} ${s.group} ${s.subgroup ?? ""} ${s.description ?? ""} ${s.key.replace(/[_.-]/g, " ")} ${s.outputFields.join(" ")}`.toLowerCase();
}

/**
 * Plain-intent synonyms, one set per kind of data: a person who types any word of a set finds
 * sources that talk about any other word of it. Multi-word entries match as a phrase.
 */
const SYNONYM_SETS: readonly (readonly string[])[] = [
  ["review", "rating", "feedback", "testimonial", "opinion", "stars", "customer", "complaint"],
  ["job", "hiring", "opening", "career", "vacancy", "recruit", "employment", "position"],
  ["place", "local business", "near me", "nearby", "map", "maps", "restaurant", "store location", "shop", "address"],
  ["product", "price", "pricing", "store", "ecommerce", "e-commerce", "marketplace", "item", "listing", "buy"],
  ["company", "business", "funding", "employee", "startup", "organization", "firm", "investor", "revenue"],
  ["home", "house", "real estate", "property", "listing", "apartment", "rental", "realtor"],
];

const STOP_WORDS = new Set(["a", "an", "the", "for", "of", "to", "in", "on", "at", "and", "or", "my", "me", "about", "from", "with", "i", "what", "who", "which", "where", "how", "want", "need", "get", "find", "show", "is", "are", "do", "some", "any", "all"]);

const stem = (w: string) => (w.length > 3 && w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/** The words a query word may stand for: itself plus its synonym sets (all lower-case, stemmed). */
function expansions(word: string): string[] {
  const w = stem(word);
  const out = new Set<string>([w]);
  for (const set of SYNONYM_SETS) if (set.some((x) => stem(x) === w)) for (const x of set) out.add(x.includes(" ") ? x : stem(x));
  return [...out];
}

/**
 * Sources matching ANY word of `query` (plain words, stop words ignored, plurals folded, synonyms
 * understood), best first: the more of the person's words a source answers the higher it ranks; a
 * label hit beats a description hit; direct words beat synonyms; featured, then confirmed, then
 * catalog order break ties. "customer reviews for a company" finds the review sources first.
 */
export function searchSources(sources: readonly LibrarySource[], query: string): LibrarySource[] {
  const all = query.toLowerCase().split(/[^a-z0-9.+-]+/).filter(Boolean);
  if (all.length === 0) return [...sources];
  const words = all.filter((w) => !STOP_WORDS.has(w));
  const used = words.length > 0 ? words : all;
  const scored: { s: LibrarySource; score: number; i: number }[] = [];
  sources.forEach((s, i) => {
    const hay = haystack(s);
    const hayStemmed = hay.split(/[^a-z0-9]+/).map(stem).join(" ");
    const label = s.label.toLowerCase();
    let matched = 0;
    let score = 0;
    for (const w of used) {
      const direct = hay.includes(w) || hayStemmed.includes(stem(w));
      let best = 0;
      if (direct) best = label.includes(w) || label.includes(stem(w)) ? 8 : 4;
      else if (expansions(w).some((x) => (x.includes(" ") ? hay.includes(x) : hayStemmed.includes(x)))) best = expansions(w).some((x) => label.includes(x)) ? 3 : 2;
      if (best > 0) matched += 1;
      score += best;
    }
    if (matched === 0) return;
    scored.push({ s, score: matched * 10 + score + (s.featured ? 2 : 0) + (s.confirmed ? 1 : 0), i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.s);
}

/** A subgroup this large is a list, never a wall of cards. */
export const COMPACT_SUBGROUP_MIN = 24;

export interface LibrarySection {
  group: string;
  /** Sources shown as cards (in catalog order). */
  cards: LibrarySource[];
  /** Huge subgroups, shown as one searchable compact list each. */
  lists: { subgroup: string; sources: LibrarySource[] }[];
  count: number;
}

/**
 * The group sections below the featured shelf: every source in its group; a subgroup with at least
 * `COMPACT_SUBGROUP_MIN` sources becomes a compact list instead of cards.
 */
export function librarySections(sources: readonly LibrarySource[], minList = COMPACT_SUBGROUP_MIN): LibrarySection[] {
  const bySub = new Map<string, number>();
  for (const s of sources) if (s.subgroup) bySub.set(`${s.group}\u0000${s.subgroup}`, (bySub.get(`${s.group}\u0000${s.subgroup}`) ?? 0) + 1);
  const out: LibrarySection[] = [];
  for (const s of sources) {
    let sec = out.find((x) => x.group === s.group);
    if (!sec) {
      sec = { group: s.group, cards: [], lists: [], count: 0 };
      out.push(sec);
    }
    sec.count += 1;
    const big = s.subgroup && (bySub.get(`${s.group}\u0000${s.subgroup}`) ?? 0) >= minList;
    if (big) {
      let list = sec.lists.find((l) => l.subgroup === s.subgroup);
      if (!list) {
        list = { subgroup: s.subgroup!, sources: [] };
        sec.lists.push(list);
      }
      list.sources.push(s);
    } else sec.cards.push(s);
  }
  return out;
}

/** Identity columns (a link, an id) say little on a card: they go after the telling ones. */
const plumbing = (f: string) => /^(url|id)$|\b(url|id)$/i.test(f.trim());

/** Every field, the telling ones first and the identity columns (link, id) last. */
export function orderTellingFields(fields: readonly string[]): string[] {
  return [...fields.filter((f) => !plumbing(f)), ...fields.filter(plumbing)];
}

/** The first `max` telling output fields and how many more (every field is still counted). */
export function fieldPreview(fields: readonly string[], max = 4): { shown: string[]; more: number } {
  const ordered = orderTellingFields(fields);
  return { shown: ordered.slice(0, max), more: Math.max(0, fields.length - max) };
}

/** The one line under a card's title: the server's description, else what the input asks for. */
export function sourceLine(s: LibrarySource): string {
  if (s.description) return s.description;
  if (s.input.kind === "url") return s.subgroup ? `${s.subgroup} · from a page address` : "From a page address";
  const asks = s.input.fields.filter((f) => f.required).map((f) => f.label.toLowerCase());
  return asks.length ? `Search by ${asks.join(", ")}` : "Search";
}
