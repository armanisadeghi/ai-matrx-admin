/**
 * Sign-up welcome — "Which one is you?": the anchor round's candidates grouped into distinct people
 * (SIGNUP-WELCOME.md § Grouping into people). Pure; rules only, no AI.
 *
 * Input: the person anchor stage's evidence items (`anchor` set; aidream brand.identify.person_anchor_extract) and the
 * name that was searched. A candidate counts only when its display name IS that name after normalizing (a "Rachelle"
 * is not a "Rochelle"), plus the person's own website (its host spells the name). Candidates are one person when they
 * share a handle across platforms (dots, underscores and dashes ignored), state the same city (a bare country is no
 * city), one links the other, or they show the same profile photo: the same image address (its query aside), or the
 * same picture by the server's perceptual fingerprint (`photoGroups`, aidream image_groups.py; live 2026-10-21: one
 * Thomas Frank was two cards). A platform's stock picture never counts.
 * Strongest first (the sum of the rule scores); at most `max` shown, `more` = how many were not. A person with
 * neither a line nor a place is never a card (nothing to recognize yourself by); they count in `more`.
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
  /** City, region: the most specific place any of their accounts states. */
  place: string | null;
  /** The employer or business a profile names ("Experience: Flylighter", "Owner at Klomann Accounting LLC"), when the
   *  card's line shows it; null when the line is a bio sentence. Picking the card confirms it. */
  company: string | null;
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

let countryNames: Set<string> | null = null;
/** Every country's English name ("united states", "united kingdom"), plus the usual short forms. */
function isCountry(text: string): boolean {
  if (!countryNames) {
    countryNames = new Set(["usa", "us", "uk", "uae"]);
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    for (let a = 65; a <= 90; a++)
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const name = names.of(code);
        if (name && name !== code) countryNames.add(normName(name));
      }
  }
  return countryNames.has(normName(text));
}

/** The city a location names; "" for a bare country ("United States"), which says nothing about who. */
function cityOf(location: string | null | undefined): string {
  const first = (location ?? "").split(",")[0] ?? "";
  return isCountry(first) ? "" : normName(first);
}

/** A profile photo address compared as one picture: no scheme, no query or fragment, lower-case host. */
function photoKey(url: string | null | undefined): string {
  if (!url || isStockPhoto(url)) return "";
  return url.replace(/^https?:\/\//i, "").replace(/[?#].*$/, "").replace(/^[^/]+/, (h) => h.toLowerCase());
}

/** The same profile photo: one address, or one picture by the server's fingerprint groups. */
function samePhoto(a: EvidenceItem, b: EvidenceItem, photoGroups?: ReadonlyMap<string, string>): boolean {
  const ka = photoKey(a.image_url);
  if (!ka || !photoKey(b.image_url)) return false;
  if (ka === photoKey(b.image_url)) return true;
  const ga = photoGroups?.get(a.key);
  return Boolean(ga) && ga === photoGroups?.get(b.key);
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

function samePerson(a: EvidenceItem, b: EvidenceItem, photoGroups?: ReadonlyMap<string, string>): boolean {
  const ka = idKey(a);
  if (ka.length >= 3 && ka === idKey(b)) return true;
  const ca = cityOf(locationOf(a));
  if (ca && ca === cityOf(locationOf(b))) return true;
  if (samePhoto(a, b, photoGroups)) return true;
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

/**
 * Text a source masked (LinkedIn shows a signed-out reader "********* ** ***" for a profile's about text; live
 * 2026-10-21 a card headline was all asterisks): mask characters are a third or more of its letters and marks.
 */
export function isMaskedText(raw: string | null | undefined): boolean {
  const s = (raw ?? "").replace(/\s+/g, "");
  if (!s) return false;
  const masked = (s.match(/[*•●∗＊]/gu) ?? []).length;
  return masked >= 3 && masked / s.length >= 1 / 3;
}

/** One line: whitespace collapsed, trailing ellipsis dropped, the first sentence, at most LINE_MAX characters. */
export function cleanLine(raw: string | null | undefined): string | null {
  let s = (raw ?? "").replace(/\s+/g, " ").replace(/(…|\.{3})\s*$/, "").trim();
  if (!s || isMaskedText(s)) return null;
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

/** A Facebook-style intro line's work ("Johanna Klomann ; Lives in Flagstaff, Arizona ; Owner at Klomann Accounting LLC"). */
const WORK_AT = /(?:^|[;·|]\s*)((?:Owner|Founder|Co-founder|CEO|President|Partner|Director|Manager|Works|Worked)\s+at\s+[^;·|]+)/i;
/** The same intro's place ("Lives in Flagstaff, Arizona"). */
const LIVES_IN = /(?:^|[;·|]\s*)Lives in\s+([^;·|]+)/i;

/** The employer a LinkedIn result names ("· Experience: KGW-TV · Education: …"), or a Facebook intro's work. */
function employerOf(i: EvidenceItem): string | null {
  const m = /Experience:\s*([^·|]+)/.exec(i.snippet ?? "");
  if (m) return cleanLine(m[1]);
  const w = WORK_AT.exec(i.snippet ?? "");
  return w ? cleanLine(w[1]) : null;
}

/** "Owner at Klomann Accounting LLC" → "Klomann Accounting LLC"; "Flylighter" stays. */
function companyOfWork(work: string): string {
  return work.replace(/^(?:Owner|Founder|Co-founder|CEO|President|Partner|Director|Manager|Works|Worked)\s+at\s+/i, "").trim();
}

/** Where the candidate is: its profile's location, else the place its intro line states. */
function locationOf(i: EvidenceItem): string | null {
  if (i.anchor?.location) return i.anchor.location;
  const m = LIVES_IN.exec(i.snippet ?? "");
  return m ? m[1].trim().replace(/[.\s]+$/, "") : null;
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

/** The card's line, and the company it names when the line is an employer (a bio sentence names none). */
function lineOf(items: EvidenceItem[], want: string): { line: string | null; company: string | null } {
  const cities = items.map((i) => cityOf(locationOf(i))).filter(Boolean);
  const ok = (l: string | null): l is string => Boolean(l) && !isPlaceLine(l as string, cities);
  for (const i of items) {
    const e = employerOf(i);
    if (ok(e)) return { line: e, company: companyOfWork(e.replace(/…$/, "")) || null };
  }
  for (const i of items) {
    const b = cleanLine(i.anchor?.bio_line);
    if (ok(b)) return { line: b, company: null };
  }
  // Their own site's title names what they do ("Klomann Accounting LLC"), unless it is only their name.
  for (const i of items) {
    if (i.field !== "website") continue;
    const t = cleanLine(i.label);
    if (ok(t) && normName(t) !== want && normName(t) !== normName(hostOf(i))) return { line: t, company: null };
  }
  return { line: null, company: null };
}

/** The most specific place the accounts state ("Des Moines, Iowa, United States" over "United States"). */
function bestLocation(items: EvidenceItem[]): string | null {
  const all = items.map(locationOf).filter((l): l is string => Boolean(l));
  const parts = (l: string) => l.split(",").filter((p) => p.trim()).length;
  return all.reduce<string | null>((best, l) => (best === null || parts(l) > parts(best) ? l : best), null);
}

const titleCase = (s: string) => s.replace(/(^|[\s'-])(\p{Ll})/gu, (_m, pre: string, c: string) => pre + c.toUpperCase());

/**
 * The name a card shows. The card IS the person searched (same name once normalized), so it shows the sign-up name's
 * own casing ("mike Little" in a source reads "Mike Little"); a sign-up name typed all lower-case never lowers a source
 * that is cased, and an all lower-case pair reads title-cased. Any other name keeps its own (deliberate) casing.
 */
export function displayName(searched: string, found: string): string {
  const s = searched.trim().replace(/\s+/g, " ");
  const f = found.trim().replace(/\s+/g, " ");
  if (normName(s) !== normName(f)) return f || s;
  if (/\p{Lu}/u.test(s)) return s;
  return /\p{Lu}/u.test(f) && f === titleCase(f) ? f : titleCase(s);
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

/** What a card shows about one person's accounts (taken as one person): its line, the company it names, its place. */
export function cardFacts(
  accounts: readonly EvidenceItem[],
  searchedName: string,
): { line: string | null; company: string | null; place: string | null } {
  return { ...lineOf([...accounts], normName(searchedName)), place: placeOf(bestLocation([...accounts])) };
}

export function peopleGroups(
  items: readonly EvidenceItem[],
  searchedName: string,
  max = MAX_PEOPLE,
  /** Evidence key → the server's photo group (one picture), for the candidates' profile photos. */
  photoGroups?: ReadonlyMap<string, string>,
): PeopleGroups {
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
      if (samePerson(keep[i], keep[j], photoGroups)) parent[find(i)] = find(j);
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
      const { line, company } = lineOf(g, want);
      return {
        id: g[0].key,
        name: displayName(searchedName, (named && nameOf(named)) || searchedName),
        photo: photoOf(g),
        line,
        company,
        place: placeOf(bestLocation(g)),
        accounts: g,
        strength: Math.round(g.reduce((s, i) => s + scoreOf(i), 0) * 10) / 10,
      };
    })
    .sort((a, b) => b.strength - a.strength);
  // A person with neither a line nor a place gives nothing to recognize yourself by: not a card, counted in `more`.
  const shown = people.filter((p) => p.line || p.place).slice(0, max);
  return { people: shown, more: people.length - shown.length };
}

/** The candidates' real profile photos (never a stock picture), for the server's photo groups: one per key. */
export function candidatePhotos(
  items: readonly EvidenceItem[],
  searchedName: string,
): { key: string; url: string; profile_id: string | null; platform: string | null; where: string | null }[] {
  const seen = new Set<string>();
  return sameNameCandidates(items, searchedName)
    .filter((i) => i.image_url && !isStockPhoto(i.image_url) && !seen.has(i.key) && Boolean(seen.add(i.key)))
    .map((i) => ({ key: i.key, url: i.image_url as string, profile_id: i.profile_id, platform: i.platform, where: i.source.where }));
}
