/**
 * NAME → PAGE for link-only sources — pure. A person types what they know (a company, an app, an
 * @handle); compare's ONE lookup (`features/comparison/server.ts` `lookupItems`, aidream
 * `/comparison/lookup`) finds the page the source reads. Nothing here searches: it only says, per
 * source, which lookup to ask and how to turn its answer into the source's page address.
 *
 *   - company reviews: the `companies_reviews` lookup (name or website → its review page);
 *   - a page on one site (G2, LinkedIn company, the app stores): `list_items` with `inputs.site`;
 *   - a store product (one product over time): the `products` lookup, kept to the source's store;
 *   - an @handle: `social_accounts`, sent as the profile link it names (free, no search).
 */

import type { ComparisonItemInput, LookupItem, LookupMatch } from "@/features/comparison/contract";

export interface NameFinder {
  /** compare's lookup kind. */
  kind: "companies_reviews" | "list_items" | "products" | "social_accounts";
  label: string;
  example: string;
  /** `list_items`: the site (host + path) the page lives on. */
  site?: string;
  /** `social_accounts`: the profile address a bare handle names (`{h}`). */
  profile?: string;
  /** Only pages on this host are the source's own (a store product). */
  host?: RegExp;
  /** The found page → the address the source reads (G2 reads the product's reviews page). */
  page?: (url: string) => string;
}

const g2Reviews = (url: string) => url.replace(/\/+$/, "").replace(/(\/products\/[^/]+)(\/.*)?$/, "$1/reviews");

const handle = (profile: string): NameFinder => ({ kind: "social_accounts", label: "Account", example: "@nasa", profile });

/** The sources that take a name instead of a link. A source not listed asks as before. */
export const NAME_FINDERS: Readonly<Record<string, NameFinder>> = {
  trustpilot_reviews: { kind: "companies_reviews", label: "Company name or website", example: "Apple or apple.com" },
  g2_reviews: { kind: "list_items", site: "g2.com/products", label: "Product name", example: "Slack", page: g2Reviews },
  linkedin_company: { kind: "list_items", site: "linkedin.com/company", label: "Company name", example: "Stripe" },
  app_store_reviews: { kind: "list_items", site: "apps.apple.com", label: "App name", example: "Spotify" },
  google_play_reviews: { kind: "list_items", site: "play.google.com/store/apps", label: "App name", example: "Spotify" },
  amazon_product: { kind: "products", host: /(^|\.)amazon\./i, label: "Product name", example: "Stanley tumbler" },
  amazon_price_availability: { kind: "products", host: /(^|\.)amazon\./i, label: "Product name", example: "Stanley tumbler" },
  walmart_product: { kind: "products", host: /(^|\.)walmart\./i, label: "Product name", example: "Stanley tumbler" },
  tiktok_posts: handle("https://www.tiktok.com/@{h}"),
  tiktok_profiles: handle("https://www.tiktok.com/@{h}"),
  instagram_profiles: handle("https://www.instagram.com/{h}/"),
  x_posts: handle("https://x.com/{h}"),
  x_profiles: handle("https://x.com/{h}"),
  youtube_channels: handle("https://www.youtube.com/@{h}"),
};

export function nameFinderFor(sourceKey: string): NameFinder | null {
  return NAME_FINDERS[sourceKey] ?? null;
}

const looksLikeWebsite = (s: string) => /^[^\s@/]+\.[a-z]{2,}(\/.*)?$/i.test(s.trim());

/** What the lookup is asked for this typed text; null when there is nothing to ask. */
export function lookupItemFor(finder: NameFinder, typed: string): ComparisonItemInput | null {
  const q = typed.trim();
  if (!q) return null;
  if (finder.kind === "social_accounts") {
    if (/^https?:\/\//i.test(q)) return { url: q };
    const h = q.replace(/^@/, "").trim();
    return h && !/\s/.test(h) && finder.profile ? { url: finder.profile.replace("{h}", h) } : null;
  }
  if (finder.kind === "companies_reviews" && looksLikeWebsite(q)) return { label: q, website: q, inputs: { website: q } };
  if (finder.kind === "list_items") return { label: q, inputs: { name: q, site: finder.site ?? "" } };
  return { label: q, inputs: { name: q } };
}

/** A match's page as the source reads it; null when it is not the source's own (another store). */
export function pageOf(finder: NameFinder, m: LookupMatch | null | undefined): string | null {
  const url = m?.url ?? m?.item.url ?? null;
  if (!url) return null;
  if (finder.host) {
    try {
      if (!finder.host.test(new URL(url).hostname)) return null;
    } catch {
      return null;
    }
  }
  return finder.page ? finder.page(url) : url;
}

export type FinderAnswer =
  | { status: "found"; match: LookupMatch; page: string }
  | { status: "choose"; candidates: { match: LookupMatch; page: string }[] }
  | { status: "not_found"; message: string };

/** One lookup row → what the box shows: the page (certain), "Is this them?" (several), or not found. */
export function answerOf(finder: NameFinder, item: LookupItem | null | undefined): FinderAnswer {
  if (!item) return { status: "not_found", message: "Nothing came back. Try again." };
  const page = pageOf(finder, item.match);
  if (item.status === "found" && item.match && page) return { status: "found", match: item.match, page };
  const candidates = [item.match, ...item.candidates]
    .flatMap((m) => {
      const p = pageOf(finder, m);
      return m && p ? [{ match: m, page: p }] : [];
    })
    .filter((c, i, all) => all.findIndex((x) => x.page === c.page) === i);
  if (candidates.length > 0) return { status: "choose", candidates };
  return { status: "not_found", message: item.message || "We could not find that. Check the spelling or paste its page." };
}
