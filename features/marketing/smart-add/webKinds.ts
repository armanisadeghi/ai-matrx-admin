/**
 * Smart Add — "what is this to us?" for every web result (pure; no I/O, no AI).
 *
 * One vocabulary for every found thing: `web.brand_relation_kind` (key, label, stance, routes_to,
 * has_sentiment, metadata.match). The social rows' Ours / Not us / Related… answer from the same
 * table. Here each web result gets a DETERMINISTIC suggestion from rules and data we already hold —
 * the confirmed site and accounts, the brand's name, and each kind's own host/path rules — shown as
 * the highlighted option with its reason. It is never set for the person: they decide.
 *
 * Spec: common-docs/systems/marketing/websites-and-brands/projects/smart-add-brand/SPEC.md ("On the web").
 */

import type { BrandRelationKind, RelationStance } from "@/features/marketing/data/service";
import { websiteHost, type EvidenceItem } from "./evidence";

export type Sentiment = "positive" | "neutral" | "negative";

/** The person's answer for one web result. */
export interface WebChoice {
  kind: string;
  sentiment: Sentiment | null;
}

/** A rule-based suggestion and why. */
export interface WebSuggestion {
  kind: string;
  reason: string;
}

/** The order the groups read in, and their names. */
export const STANCE_ORDER: readonly RelationStance[] = ["ours", "about_us", "associated", "competitor", "not_us", "irrelevant"];
export const STANCE_LABEL: Record<RelationStance, string> = {
  ours: "Ours",
  about_us: "About us",
  associated: "Associated",
  competitor: "Competitor",
  not_us: "Not us",
  irrelevant: "Irrelevant",
};

/** What the suggestion rules read: the facts the person has confirmed so far. */
export interface SuggestContext {
  /** Hosts of every website confirmed as ours (no www). */
  ourHosts: string[];
  /** Addresses (no scheme/www, lowercase) of every account confirmed as ours. */
  ourAccounts: string[];
  /** The brand's best name (confirmed, else found). */
  name: string | null;
  /** Addresses of accounts we FOUND but the person has not answered yet: never called "Not us" (MKT-038). */
  foundAccounts?: string[];
  /** Handles of our confirmed or found accounts, comparison form (`ritualcoffee`): the same handle on an ordering or store host is ours. */
  ourHandles?: string[];
}

/** "https://www.Yelp.com/biz/x?y" → "yelp.com/biz/x" — the form the kinds' path rules read. */
export function webAddress(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^(www|m|mobile)\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/**
 * Query parameters that NAME the page (MKT-067): `youtube.com/watch?v=A` and `?v=B` are two videos. Everything
 * else (utm_*, fbclid, si…) is tracking. Mirrors aidream `brand_identify_web.IDENTIFYING_PARAMS`.
 */
const IDENTIFYING_PARAMS = new Set(["v", "id", "fbid", "story_fbid", "list", "k", "q", "p"]);

/** One page's identity: `webAddress` plus its identifying query parameters, sorted, values as given. */
export function webIdentity(url: string): string {
  const query = url.trim().split("#", 1)[0].split("?").slice(1).join("?");
  const keep = [...new URLSearchParams(query)]
    .map(([k, v]) => [k.toLowerCase(), v] as const)
    .filter(([k, v]) => IDENTIFYING_PARAMS.has(k) && v)
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  const base = webAddress(url);
  return keep.length ? `${base}?${new URLSearchParams(keep as [string, string][]).toString()}` : base;
}

/**
 * What a "Not us" on a web address stores (MKT-073): the whole host for a bare site, else the page's identity
 * (`webIdentity`), so excluding one YouTube video never excludes every video.
 */
export function exclusionMatchForUrl(url: string): { kind: "host" | "url"; value: string } {
  const identity = webIdentity(url);
  return /[/?]/.test(identity) ? { kind: "url", value: identity } : { kind: "host", value: identity };
}

function hostIs(host: string, base: string): boolean {
  const b = base.replace(/^www\./, "").toLowerCase();
  return host === b || host.endsWith(`.${b}`);
}

/** 'Café Ritual, Inc.' → 'caferitualinc' — the comparison form of a name. */
function norm(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Words that say nothing about WHICH business it is. */
const GENERIC = new Set(["the", "and", "inc", "llc", "ltd", "co", "corp", "company", "group", "official", "www", "com"]);

function tokens(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !GENERIC.has(t));
}

/**
 * Same or similar name: the whole name squeezed together appears, or at least two thirds (and two)
 * of its telling words do ("Spectrum Search Group" vs "Full Spectrum Search Group").
 */
export function nameMatches(name: string, places: string[]): boolean {
  const whole = norm(name);
  const words = tokens(name);
  return places.some((place) => {
    if (!place) return false;
    if (whole.length >= 3 && norm(place).includes(whole)) return true;
    const squeezed = norm(place);
    const found = words.filter((w) => squeezed.includes(w)).length;
    return words.length >= 2 && found >= 2 && found >= Math.ceil((words.length * 2) / 3);
  });
}

function sameOrSimilar(name: string, lead: string): string {
  return norm(lead).includes(norm(name)) ? "Same" : "Similar";
}

/**
 * The kind whose rules (metadata.match, with its known-domain categories expanded) claim this address.
 * A path rule of any kind beats a whole-host rule of any kind (indeed.com/cmp/x/reviews is a review page
 * even though indeed.com is a job board); within each pass, vocabulary order.
 */
export function kindByRules(url: string, kinds: BrandRelationKind[]): { kind: BrandRelationKind; rule: string } | null {
  const address = webAddress(url);
  const host = address.split("/")[0] ?? "";
  for (const kind of kinds) {
    for (const p of kind.match.paths) {
      try {
        if (new RegExp(p).test(address)) return { kind, rule: host };
      } catch {
        // A malformed rule in the data never breaks the screen; it just never matches.
      }
    }
  }
  for (const kind of kinds) {
    const h = kind.match.hosts.find((x) => (x.includes("/") ? address.startsWith(x) : hostIs(host, x)));
    if (h) return { kind, rule: h };
  }
  return null;
}

/**
 * The suggested answer for one web result, by fixed rules in order (first match wins):
 *  1. its site is one of our confirmed websites (or a subdomain) → Ours;
 *  2. it is a page of one of our confirmed accounts (a post) → Ours;
 *  3. a kind's own host/path rules claim it (review sites, claimable listings, news, stores,
 *     press wires, job boards — data on web.brand_relation_kind) → that kind;
 *  4. the server classed it a review/listing page → Review site / Listing we can claim;
 *     a news/video/image result → Mentions us;
 *  5. its title or snippet names our website → Mentions us;
 *  5b. the same handle as one of our accounts, as a page's subdomain or first path part → Ours;
 *  6. the page is ABOUT a same- or similar-named business (title lead, site name or first path
 *     part) on another site that never names our website → Not us (a possible mistaken identity);
 *  7. its title or snippet names us → Mentions us;
 *  otherwise no suggestion.
 */
export function suggestKind(item: EvidenceItem, kinds: BrandRelationKind[], ctx: SuggestContext): WebSuggestion | null {
  const has = (key: string) => kinds.some((k) => k.key === key);
  const url = item.url ?? item.value;
  const address = webAddress(url);
  const host = websiteHost(url).replace(/^www\./, "");
  const ourSite = ctx.ourHosts.find((h) => hostIs(host, h));
  if (ourSite && has("ours")) return { kind: "ours", reason: `Same site as ${ourSite}, your website` };
  const ourAccount = ctx.ourAccounts.find((a) => address === a || address.startsWith(`${a}/`));
  if (ourAccount && has("ours")) return { kind: "ours", reason: `A page of ${ourAccount}, your account` };
  // The same handle as one of our accounts, as the name of a page on another host (an order page at
  // `ritualcoffee.square.site`, a store at `shop.example/ritualcoffee`): ours (MKT-038).
  const handles = new Set((ctx.ourHandles ?? []).filter((h) => h.length >= 3));
  if (handles.size && has("ours")) {
    const labels = host.split(".");
    const named = [labels.length > 2 ? labels[0] : "", address.split("/")[1] ?? ""].map(norm).find((x) => x && handles.has(x));
    if (named) return { kind: "ours", reason: `Same name (${named}) as your account, on ${host}` };
  }
  const ruled = kindByRules(url, kinds);
  if (ruled) return { kind: ruled.kind.key, reason: `${ruled.rule}: ${ruled.kind.label.toLowerCase()}` };
  if (item.field === "listing") {
    const key = has("review_site") ? "review_site" : "claimable_listing";
    if (has(key)) return { kind: key, reason: `${item.label ?? host} page` };
  }
  if (item.field === "mention" && has("mention")) return { kind: "mention", reason: `A ${item.platform ?? "news"} result` };
  const said = `${item.label ?? ""} ${item.snippet ?? ""}`.toLowerCase();
  const namesUs = ctx.ourHosts.find((h) => said.includes(h));
  if (namesUs && has("mention")) return { kind: "mention", reason: `Names ${namesUs}` };
  // Who this page is ABOUT: the head of its title (up to the first separator, no longer than the
  // name), its site name, and — on a one-part address like a profile — that part.
  const lead = ((item.label ?? "").split(/\s[|\-–—:·]\s/)[0] ?? "")
    .split(/\s+/)
    .slice(0, (ctx.name ?? "").split(/\s+/).length + 1)
    .join(" ");
  const parts = address.split("/");
  // (a long slug is a page title, not a name: "i-j-healthcare-recruiter-full-spectrum-search-group").
  const firstPart = parts.length === 2 && norm(parts[1]).length <= norm(ctx.name ?? "").length + 8 ? parts[1] : "";
  // Never "Not us" for a page of an account we found, nor for a deeper page that merely carries our whole name
  // in its title (an article about us): a wrong "Not us" is the worst error this step can make (MKT-038).
  const foundAccount = (ctx.foundAccounts ?? []).some((a) => address === a || address.startsWith(`${a}/`));
  const articleAboutUs = Boolean(ctx.name) && parts.length > 2 && norm(ctx.name ?? "").length >= 3 && norm(lead).includes(norm(ctx.name ?? ""));
  const sameName = nameMatches(ctx.name ?? "", [lead, host.split(".").slice(0, -1).join(" "), firstPart]);
  if (ctx.name && sameName && !foundAccount && !articleAboutUs && has("not_us")) {
    return {
      kind: "not_us",
      reason: ctx.ourHosts.length
        ? `${sameOrSimilar(ctx.name, lead)} name on ${host}, which never names ${ctx.ourHosts[0]}: possibly someone else`
        : `${sameOrSimilar(ctx.name, lead)} name on ${host}: possibly someone else`,
    };
  }
  if (ctx.name && norm(ctx.name).length >= 3 && norm(said).includes(norm(ctx.name)) && has("mention")) {
    return { kind: "mention", reason: `Names ${ctx.name}` };
  }
  return null;
}

/** Results grouped by the kind the person chose, in vocabulary order (stance, then sort). */
export function groupByKind(
  items: EvidenceItem[],
  choices: Record<string, WebChoice>,
  kinds: BrandRelationKind[],
): { stance: RelationStance; kind: BrandRelationKind; items: EvidenceItem[] }[] {
  const byKey = new Map(kinds.map((k) => [k.key, k]));
  const groups = new Map<string, EvidenceItem[]>();
  for (const i of items) {
    const c = choices[i.key];
    if (!c || !byKey.has(c.kind)) continue;
    groups.set(c.kind, [...(groups.get(c.kind) ?? []), i]);
  }
  const order = (k: BrandRelationKind) => STANCE_ORDER.indexOf(k.stance) * 10000 + kinds.indexOf(k);
  return [...groups.entries()]
    .map(([key, list]) => ({ kind: byKey.get(key) as BrandRelationKind, items: list }))
    .sort((a, b) => order(a.kind) - order(b.kind))
    .map((g) => ({ stance: g.kind.stance, ...g }));
}

/**
 * "#1 · #3" — each engine's best rank, best first. Engine names are vendor names: never on a customer
 * screen (VendorNameRuntimeGuard); they stay on the item for the Builder panel.
 */
export function engineRanks(item: EvidenceItem): string {
  const best = new Map<string, number>();
  for (const h of item.hits ?? []) {
    const e = h.engine || "web";
    best.set(e, Math.min(best.get(e) ?? 99, h.rank));
  }
  return [...best.values()]
    .sort((a, b) => a - b)
    .map((r) => `#${r}`)
    .join(" · ");
}
