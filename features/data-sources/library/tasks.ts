/**
 * The Data library's task-first home — pure. A normal person does not shop a catalog of 1,200
 * developer rows; they arrive with a job in plain words ("see what customers say about a company").
 * This file is the ONE place those jobs live: a short, hand-picked list of everyday tasks, each
 * pointing at the real sources that answer it, best first.
 *
 * It degrades honestly against whatever the live catalog holds: a curated key the server no longer
 * ships simply drops, and a task that resolves to nothing is hidden (never a dead card). When none
 * of a task's curated keys survive, its plain `search` words stand in so the task still lands on
 * something real. Confirmed (live-verified) sources are always offered first; the rest sit under
 * "More sources". Curation is platform-level — a plain job mapped to a kind of data — never shaped
 * to any one customer.
 */

import {
  Briefcase,
  Building2,
  Home,
  MapPin,
  MessageSquareQuote,
  Smartphone,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";

import { searchSources, type Library, type LibrarySource } from "./catalog";

export interface LibraryTask {
  id: string;
  /** The job in the person's own words. */
  title: string;
  /** One plain line of what it looks like — never jargon, never a vendor-only word. */
  example: string;
  icon: LucideIcon;
  /** Real source keys that answer the job, best first; unknown ones drop at resolve time. */
  sourceKeys: readonly string[];
  /** Plain words used only when none of `sourceKeys` survive, so the task still lands on data. */
  search: string;
}

/**
 * The everyday jobs the library opens with. Kept small on purpose — eight big doors, not a wall.
 * Titles read as something a person wants to do, not a feature name.
 */
export const LIBRARY_TASKS: readonly LibraryTask[] = [
  {
    id: "company-reviews",
    title: "See what customers say about a company",
    example: "Reviews and ratings for a business",
    icon: MessageSquareQuote,
    sourceKeys: ["trustpilot_reviews", "google_maps_place", "yelp_reviews", "g2_reviews"],
    search: "customer reviews ratings reputation",
  },
  {
    id: "local-business",
    title: "Find local businesses",
    example: "Places near a city, with ratings and contact",
    icon: MapPin,
    sourceKeys: ["google_maps_place", "yelp_reviews"],
    search: "local business places near me map",
  },
  {
    id: "competitor-hiring",
    title: "Track a competitor's hiring",
    example: "Open roles at a company",
    icon: Briefcase,
    sourceKeys: ["linkedin_jobs_search", "indeed_jobs", "glassdoor_jobs_search", "linkedin_job"],
    search: "jobs hiring open roles careers",
  },
  {
    id: "product-price",
    title: "Watch a product's price",
    example: "Price and stock for a product online",
    icon: Tag,
    sourceKeys: ["amazon_product", "walmart_product", "google_shopping", "amazon_price_availability"],
    search: "product price stock shopping",
  },
  {
    id: "research-company",
    title: "Research a company",
    example: "Funding, size, finances and news for a business",
    icon: Building2,
    sourceKeys: ["crunchbase_company", "linkedin_company", "owler_companies", "yahoo_finance_companies"],
    search: "company funding investors employees revenue",
  },
  {
    id: "homes-for-sale",
    title: "Find homes for sale",
    example: "Property listings in an area",
    icon: Home,
    sourceKeys: ["zillow_listing", "realtor_international", "zoopla_listings"],
    search: "homes houses real estate property listings",
  },
  {
    id: "creator-posts",
    title: "See a creator's top posts",
    example: "A public TikTok, Instagram or YouTube account",
    icon: Users,
    sourceKeys: ["tiktok_profiles", "instagram_profiles", "youtube_channels", "x_profiles", "tiktok_posts"],
    search: "creator posts social profile followers",
  },
  {
    id: "app-reviews",
    title: "Check an app's reviews",
    example: "What people say about an iPhone or Android app",
    icon: Smartphone,
    sourceKeys: ["app_store_reviews", "google_play_reviews", "g2_reviews"],
    search: "app reviews ratings store",
  },
];

export interface ResolvedTask {
  task: LibraryTask;
  /** Live-verified sources, in the task's own order. */
  confirmed: LibrarySource[];
  /** Everything else that answers the task (shown under "More sources"). */
  more: LibrarySource[];
  /** Confirmed first, then the rest — the full ordered set. */
  all: LibrarySource[];
}

/** How many search-fallback sources a task may borrow when its curated keys are all gone. */
const FALLBACK_MAX = 6;

/** Resolve one task against the live catalog: curated keys first, a search fallback if none survive. */
export function resolveTask(library: Pick<Library, "sources">, task: LibraryTask): ResolvedTask {
  const byKey = new Map(library.sources.map((s) => [s.key, s]));
  const seen = new Set<string>();
  const ordered: LibrarySource[] = [];
  for (const key of task.sourceKeys) {
    const s = byKey.get(key);
    if (s && !seen.has(s.key)) {
      seen.add(s.key);
      ordered.push(s);
    }
  }
  if (ordered.length === 0) {
    for (const s of searchSources(library.sources, task.search).slice(0, FALLBACK_MAX)) {
      if (!seen.has(s.key)) {
        seen.add(s.key);
        ordered.push(s);
      }
    }
  }
  const confirmed = ordered.filter((s) => s.confirmed && !s.knownIssue);
  const more = ordered.filter((s) => !(s.confirmed && !s.knownIssue));
  return { task, confirmed, more, all: [...confirmed, ...more] };
}

/** Every task that lands on at least one real source, in order — the home's doors. */
export function resolveTasks(library: Pick<Library, "sources">): ResolvedTask[] {
  return LIBRARY_TASKS.map((t) => resolveTask(library, t)).filter((r) => r.all.length > 0);
}
