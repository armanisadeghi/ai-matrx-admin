/**
 * Sign-up welcome — "Which one is you?": the anchor round's candidates grouped into distinct people
 * (SIGNUP-WELCOME.md § Grouping into people). Pure; rules only, no AI.
 *
 * Input: the person anchor stage's evidence items (`anchor` set; aidream brand.identify.person_anchor_extract) and the
 * name that was searched. A candidate counts only when its display name IS that name after normalising (a "Rachelle"
 * is not a "Rochelle"), plus the person's own website (its host spells the name). Candidates are one person when they
 * share a handle across platforms (dots, underscores and dashes ignored), state the same city, or one links the other.
 * Strongest first (the sum of the rule scores); at most `max` shown, `more` = how many were not. A person with
 * neither a line nor a place is never a card (nothing to recognise yourself by); they count in `more`.
 */

import { websiteHost, type EvidenceItem } from "../evidence";

export interface PersonPhoto {
  url: string | null;
  /** The stored social profile (its avatar door), when the photo came from a lookup. */
  profileId: string | null;
  /** The platform the photo is from (fallback mark). */
  platform: string;
}

export interface PersonGroup {
  /** The strongest candidate's evidence key. */
  id: string;
  name: string;
  photo: PersonPhoto | null;
  /** Job or employer, else the bio's first sentence; at most 40 characters, never a location. */
  line: string | null;
  /** City, region. */
  place: string | null;
  /** The person's accounts and sites, strongest first: what the next round grounds on. */
  accounts: EvidenceItem[];
  strength: number;
}

export interface PeopleGroups {
  people: PersonGroup[];
  /** People found but not shown. */
  more: number;
}

export const MAX_PEOPLE = 4;
export const LINE_MAX = 40;

/** "Rochelle  Moulton" / "rochelle moulton" / "Röchelle Moulton" → "rochelle moulton". */
export function normName(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** A handle compared across platforms: `nicole.long`, `nicole_long`, `nicole-long` are one. */
export function handleKey(h: string | null | undefined): string {
  return (h ?? "").toLowerCase().replace(/^@/, "").replace(/[._-]+/g, "");
}

const scoreOf = (i: EvidenceItem) => i.anchor?.score ?? 0;
const nameOf = (i: EvidenceItem) => i.anchor?.display_name ?? i.label;

function hostOf(i: EvidenceItem): string {
  return websiteHost(i.url ?? i.value);
}

/** A site's name part: `rochellemoulton.com` → `rochellemoulton`, `www.kehindewiley.co.uk` → `kehindewiley`. */
function siteBase(i: EvidenceItem): string {
  return hostOf(i).split(".")[0] ?? "";
}

/** What an account is called across platforms: its handle, or a site's name part. */
function idKey(i: EvidenceItem): string {
  return i.field === "website" ? handleKey(siteBase(i)) : handleKey(i.handle);
}

function cityOf(location: string | null | undefined): string {
  return normName((location ?? "").split(",")[0]);
}

/** Does `a` link to `b` (its own text names b's site or @handle, or it IS b by `same_as`)? */
function links(a: EvidenceItem, b: EvidenceItem): boolean {
  if (a.same_as?.includes(b.key)) return true;
  const text = [a.snippet, a.anchor?.bio_line].filter(Boolean).join(" ").toLowerCase();
  if (!text) return false;
  if (b.field === "website") return text.includes(hostOf(b));
  const h = (b.handle ?? "").toLowerCase();
  return h.length >= 4 && text.includes(`@${h}`);
}

function samePerson(a: EvidenceItem, b: EvidenceItem): boolean {
  const ka = idKey(a);
  if (ka.length >= 3 && ka === idKey(b)) return true;
  const ca = cityOf(a.anchor?.location);
  if (ca && ca === cityOf(b.anchor?.location)) return true;
  return links(a, b) || links(b, a);
}

const SMALL_WORDS = new Set(["of", "and", "the", "for", "at", "in", "on", "a", "an", "to"]);

/** "STANICKI HOLDINGS LLC" → "Stanicki Holdings LLC": an all-caps line reads as words, short tokens keep their caps. */
function unshout(s: string): string {
  if (!/\p{Lu}{4,}/u.test(s) || /\p{Ll}/u.test(s)) return s;
  return s
    .split(" ")
    .map((w, n) => {
      const lower = w.toLowerCase();
      if (n > 0 && SMALL_WORDS.has(lower)) return lower;
      if (w.replace(/[^\p{L}]/gu, "").length <= 3) return w;
      return lower.replace(/^\p{L}/u, (c) => c.toUpperCase());
    })
    .join(" ");
}

/** One line: whitespace collapsed, trailing ellipsis dropped, the first sentence, at most LINE_MAX characters. */
export function cleanLine(raw: string | null | undefined): string | null {
  let s = (raw ?? "").replace(/\s+/g, " ").replace(/(…|\.{3})\s*$/, "").trim();
  if (!s) return null;
  const first = s.split(/(?<=[.!?])\s/)[0]?.trim() ?? s;
  if (first.length >= 3) s = first;
  s = unshout(s).replace(/[\s,;:|·-]+$/, "");
  if (s.length > LINE_MAX) {
    const cut = s.slice(0, LINE_MAX - 1);
    const space = cut.lastIndexOf(" ");
    s = `${(space > LINE_MAX / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:|·-]+$/, "")}…`;
  }
  return s.length >= 2 ? s : null;
}

/** The employer a LinkedIn result names ("· Experience: KGW-TV · Education: …"). */
function employerOf(i: EvidenceItem): string | null {
  const m = /Experience:\s*([^·|]+)/.exec(i.snippet ?? "");
  return m ? cleanLine(m[1]) : null;
}

/** "Decatur, Georgia, United States" → "Decatur, Georgia". */
export function placeOf(location: string | null | undefined): string | null {
  const parts = (location ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts.slice(0, 2).join(", ") : null;
}

/** A line that only restates a place ("Palm Springs, California, United States | …") is not a line. */
function isPlaceLine(line: string, cities: string[]): boolean {
  const l = normName(line);
  return cities.some((c) => c && (l === c || l.startsWith(`${c} `)));
}

/** A platform's stock picture (LinkedIn's built-in silhouette) is no photo of the person. */
function isStockPhoto(url: string): boolean {
  return /^https?:\/\/static\.licdn\.com\//i.test(url);
}

function photoOf(items: EvidenceItem[]): PersonPhoto | null {
  const best = items.find((i) => i.image_url && !isStockPhoto(i.image_url));
  if (!best) return null;
  return { url: best.image_url, profileId: best.profile_id, platform: best.field === "website" ? "website" : (best.platform ?? "") };
}

function lineOf(items: EvidenceItem[]): string | null {
  const cities = items.map((i) => cityOf(i.anchor?.location)).filter(Boolean);
  const ok = (l: string | null): l is string => Boolean(l) && !isPlaceLine(l as string, cities);
  for (const i of items) {
    const e = employerOf(i);
    if (ok(e)) return e;
  }
  for (const i of items) {
    const b = cleanLine(i.anchor?.bio_line);
    if (ok(b)) return b;
  }
  return null;
}

/** The candidates that are this name: an exact display-name match, or a site whose host spells the name. */
export function sameNameCandidates(items: readonly EvidenceItem[], searchedName: string): EvidenceItem[] {
  const want = normName(searchedName);
  const glued = want.replace(/ /g, "");
  if (!want) return [];
  return items.filter((i) => {
    if (!i.anchor || (i.field !== "social" && i.field !== "website")) return false;
    if (normName(nameOf(i)) === want) return true;
    return i.field === "website" && glued.length >= 4 && handleKey(siteBase(i)).includes(glued);
  });
}

export function peopleGroups(items: readonly EvidenceItem[], searchedName: string, max = MAX_PEOPLE): PeopleGroups {
  const keep = [...new Map(sameNameCandidates(items, searchedName).map((i) => [i.key, i])).values()].sort(
    (a, b) => scoreOf(b) - scoreOf(a),
  );
  const parent = keep.map((_, n) => n);
  const find = (n: number): number => {
    while (parent[n] !== n) {
      parent[n] = parent[parent[n]];
      n = parent[n];
    }
    return n;
  };
  for (let i = 0; i < keep.length; i++) {
    for (let j = 0; j < i; j++) {
      if (samePerson(keep[i], keep[j])) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, EvidenceItem[]>();
  keep.forEach((item, n) => {
    const root = find(n);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  });
  const want = normName(searchedName);
  const people = [...groups.values()]
    .map((g): PersonGroup => {
      const named = g.find((i) => normName(nameOf(i)) === want);
      return {
        id: g[0].key,
        name: (named && nameOf(named)) || searchedName.trim(),
        photo: photoOf(g),
        line: lineOf(g),
        place: placeOf(g.find((i) => i.anchor?.location)?.anchor?.location),
        accounts: g,
        strength: Math.round(g.reduce((s, i) => s + scoreOf(i), 0) * 10) / 10,
      };
    })
    .sort((a, b) => b.strength - a.strength);
  // A person with neither a line nor a place gives nothing to recognise yourself by: not a card, counted in `more`.
  const shown = people.filter((p) => p.line || p.place).slice(0, max);
  return { people: shown, more: people.length - shown.length };
}
