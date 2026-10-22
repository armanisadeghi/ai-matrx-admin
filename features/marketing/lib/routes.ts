/**
 * Canonical Marketing route builders — the brand-first tree (2026-08-28).
 *
 * Two planes (design: docs/handoffs/marketing-agency-restructure.md):
 *
 *   CROSS-BRAND (small by design — only what concerns no single brand)
 *     /marketing                       — Marketing home / hub
 *     /marketing/brands                — brands list (+ /brands/new-website)
 *     /marketing/reports               — cross-brand roll-ups (+ /cost, /ranks)
 *     /marketing/operations/…          — connections, automations, approvals, data-quality
 *     /marketing/tools/…               — public analyzers index, YouTube research
 *
 *   CLIENT — everything else, nested under the brand (URLs follow the
 *   hierarchy, Arman 2026-10-22: Marketing › Brands › <brand> › <section>)
 *     /marketing/brands/[brandKey]                    — brand dashboard
 *     /marketing/brands/[brandKey]/identity/…         — the brand home (media, …)
 *     /marketing/brands/[brandKey]/websites/[siteKey]/… — website INVENTORY (pages,
 *         structure, sitemaps, media, crawls, settings)
 *     /marketing/brands/[brandKey]/seo/[siteKey]/…    — the SEO PRACTICE on one site
 *         (keywords, rankings, search-console, audit, findings, analysis,
 *         coverage, performance, changes, backlinks, links, authority,
 *         valuation, ai-visibility, growth-loop, automations, capabilities)
 *     /marketing/brands/[brandKey]/{locations,content,socials,ads,email,pr,
 *         intelligence,analytics,planning,inbox,settings}
 *
 * Segments are DUAL-MODE (key or UUID — see lib/keys.ts); builders accept
 * either and the server layouts 308 UUID addresses to the key address. Never
 * hand-build a `/marketing/...` entity path — use these builders so the
 * hierarchy can't drift per call site.
 *
 * Legacy shapes are REDIRECTS, kept so old links keep landing:
 * `/marketing/[brandKey]/…` (the 2026-08-28 → 2026-10-22 address; a next.config
 * 308, `utils/next-config/marketingBrandRedirects.js`), the pre-agency
 * `/marketing/brands/[brandId]/{sites,assets,discovery,local}/…` sections, and
 * `/marketing/sites/[siteId]/…` and the old flat pillars; builders that lack the context to emit a canonical address
 * fall back to a shim path that resolves it server/client-side.
 */

import { MARKETING_BRANDS_PATH } from "@/features/marketing/lib/keys";
import { marketingSubViewHref } from "@/features/marketing/lib/site-subviews";
import { smartAddEnrichHref, smartAddFoundHref, smartAddHref, type SmartAddLink } from "@/features/marketing/smart-add/smartAddUrl";

/** The brand asset desk's four views, in display order. */
export const MARKETING_BRAND_ASSETS_VIEWS = [
  { id: "library", label: "Library" },
  { id: "research", label: "Research" },
  { id: "sources", label: "Sources" },
  { id: "generate", label: "Generate" },
] as const;

export type MarketingBrandAssetsView =
  (typeof MARKETING_BRAND_ASSETS_VIEWS)[number]["id"];

export function isMarketingBrandAssetsView(
  value: string | null | undefined,
): value is MarketingBrandAssetsView {
  return MARKETING_BRAND_ASSETS_VIEWS.some((view) => view.id === value);
}

export type MarketingSiteSettingsView =
  | "site"
  | "integrations"
  | "access-users"
  | "access-public"
  | "intake";

/**
 * Settings tabs are ROUTES (tabs-law); access keeps its audience as a `?view=`
 * because it selects which list the ONE access screen shows.
 *
 * Those six paths used to be declared HERE as well as in the sub-view registry
 * — and the registry's copy was wrong (it had no `hrefStyle`, so the site
 * header emitted `?view=integrations` and every Settings sub-view link landed
 * on Site settings). One declaration now: `site-subviews.ts`, beside the
 * labels and icons the header renders from.
 */
export function marketingSiteSettingsHref(
  sitePath: string,
  view: MarketingSiteSettingsView = "site",
): string {
  return marketingSubViewHref(`${sitePath}/settings`, "settings", view);
}

/**
 * Where each pre-restructure site section lives now. `websites` = inventory,
 * `seo` = practice. Old slug → { branch, slug } (empty slug = branch root).
 * Consumed by `site()` (so old call sites emit new URLs) and by the legacy
 * shims that translate stored/bookmarked old addresses.
 */
export const MARKETING_SITE_SECTION_HOMES: Record<
  string,
  { branch: "websites" | "seo"; slug: string }
> = {
  "": { branch: "websites", slug: "" },
  pages: { branch: "websites", slug: "pages" },
  structure: { branch: "websites", slug: "structure" },
  sitemaps: { branch: "websites", slug: "sitemaps" },
  media: { branch: "websites", slug: "media" },
  crawls: { branch: "websites", slug: "crawls" },
  settings: { branch: "websites", slug: "settings" },
  keywords: { branch: "seo", slug: "keywords" },
  value: { branch: "seo", slug: "keywords/value" },
  ranks: { branch: "seo", slug: "rankings" },
  "ai-visibility": { branch: "seo", slug: "ai-visibility" },
  audit: { branch: "seo", slug: "audit" },
  findings: { branch: "seo", slug: "findings" },
  analysis: { branch: "seo", slug: "analysis" },
  coverage: { branch: "seo", slug: "coverage" },
  performance: { branch: "seo", slug: "performance" },
  changes: { branch: "seo", slug: "changes" },
  backlinks: { branch: "seo", slug: "backlinks" },
  links: { branch: "seo", slug: "links" },
  authority: { branch: "seo", slug: "authority" },
  "growth-loop": { branch: "seo", slug: "growth-loop" },
  automations: { branch: "seo", slug: "automations" },
  reports: { branch: "seo", slug: "reports" },
  context: { branch: "seo", slug: "context" },
};

/**
 * Business-knowledge screens moved OUT of the keyword-value ladder and into
 * the brand home (identity owns business truth; valuation consumes it).
 * Old `value/<x>` → `identity/<y>` on the brand, carrying `?site=` selection.
 */
const VALUE_TO_IDENTITY: Record<string, string> = {
  discovery: "knowledge",
  offerings: "offerings",
  topics: "offerings",
  guidelines: "guidelines",
};

/** Split "/keywords/value/rules?x=1" → old section slug + remainder + query. */
function mapLegacySiteSub(brandSeg: string, siteSeg: string, sub: string): string {
  const [path, query = ""] = sub.split("?");
  const segments = path.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  if (first === "value" && segments[1] && VALUE_TO_IDENTITY[segments[1]]) {
    const params = new URLSearchParams(query);
    params.set("site", siteSeg);
    // Site availability, worth and placement live in the catalog view of Products & services.
    if (VALUE_TO_IDENTITY[segments[1]] === "offerings" && !params.has("view")) params.set("view", "catalog");
    return `${MARKETING_BRANDS_PATH}/${brandSeg}/identity/${VALUE_TO_IDENTITY[segments[1]]}?${params.toString()}`;
  }
  // "value/rules" maps via the section table; everything after rides along.
  const home = MARKETING_SITE_SECTION_HOMES[first];
  const rest = segments.slice(1).join("/");
  const suffix = query ? `?${query}` : "";
  if (!home) {
    // Unknown section: keep it under the inventory branch so nothing 404s.
    const normalizedPath = segments.join("/");
    return `${MARKETING_BRANDS_PATH}/${brandSeg}/websites/${siteSeg}${normalizedPath ? `/${normalizedPath}` : ""}${suffix}`;
  }
  const mapped = [home.slug, rest].filter(Boolean).join("/");
  const base = `${MARKETING_BRANDS_PATH}/${brandSeg}/${home.branch}/${siteSeg}`;
  return `${mapped ? `${base}/${mapped}` : base}${suffix}`;
}

export const marketingRoutes = {
  // ── Agency plane ───────────────────────────────────────────────────────
  home: () => "/marketing",
  /** Brands front door (menus point at front doors): guests get the landing, signed in forwards to {@link brandsAll}. */
  brands: () => "/marketing/brands",
  /** The brands list (feature-pages contract: the list lives at /all). */
  brandsAll: () => "/marketing/brands/all",
  /** Add a brand: the full-page create (the same body the "Add brand" window opens). */
  brandsNew: () => "/marketing/brands/new",
  /** New-website intake (static child of /brands so it can't collide with a brand key). */
  /** Smart Add (/smart-add/company | /person). A prefill makes a deep link that starts on open (smart-add/smartAddUrl.ts). */
  smartAddBrand: (link?: SmartAddLink) => smartAddHref(link),
  /** Smart Add through the found-first door (/smart-add/found): the certain facts as cards first (VISION Part 23). */
  smartAddFound: (link?: Omit<SmartAddLink, "mode">) => smartAddFoundHref(link),
  /** Enrich an existing brand through Smart Add (the brand page and its row menu). */
  smartAddEnrich: (brandId: string) => smartAddEnrichHref(brandId),
  newSite: (brandId?: string) =>
    brandId
      ? `/marketing/brands/new-website?brand=${brandId}`
      : "/marketing/brands/new-website",
  reports: () => "/marketing/reports",
  /** Cross-brand cost roll-up (was /marketing/cost). */
  cost: () => "/marketing/reports/cost",
  /** The agency-plane social roll-up (every brand's tracked accounts and outliers). */
  social: () => "/marketing/social",
  /** Every brand's video projects in one list (Social > Videos). */
  socialVideos: () => "/marketing/social/videos",
  /** Cross-brand rank roll-up (was /marketing/ranks). */
  ranksRollup: () => "/marketing/reports/ranks",
  /** Cross-brand Search Console landing (site picker inside). */
  searchConsoleRollup: () => "/marketing/reports/search-console",
  /** Cross-brand SEO capabilities catalog (website selector inside). */
  capabilitiesCatalog: () => "/marketing/operations/capabilities",
  connections: () => "/marketing/operations/connections",
  connectionsGoogle: () => "/marketing/operations/connections/google",
  connectionsBing: () => "/marketing/operations/connections/bing",
  automations: () => "/marketing/operations/automations",
  approvals: () => "/marketing/operations/approvals",
  dataQuality: () => "/marketing/operations/data-quality",
  /** In-app index of the PUBLIC SEO analyzers (they live under `/seo/*`). */
  tools: () => "/marketing/tools",
  /** Public-video discovery and expertise comparison through YouTube Data API v3. */
  youtubeDiscovery: () => "/marketing/tools/youtube",
  youtubeVideo: (videoId: string) =>
    `/marketing/tools/youtube/videos/${encodeURIComponent(videoId)}`,
  /** Research ANY domain (seo_domain): stats, keywords, competitors, and a gap vs one of your sites. */
  domainResearch: (domain?: string | null, siteId?: string | null) => {
    const params = new URLSearchParams();
    if (domain) params.set("d", domain);
    if (siteId) params.set("site", siteId);
    const query = params.toString();
    return `/marketing/tools/domain${query ? `?${query}` : ""}`;
  },

  // ── The brand workspace ──────────────────────────────────────────────
  brand: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}`,
  /**
   * Identity › Products & services — the one home (Arman, 2026-10-21). `found` (default) is the tree Smart Add
   * found, filling live while its run goes; `catalog` is the catalog with prices, or the site workbench.
   * The old `/marketing/<brand>/offerings` forwards here.
   */
  brandOfferings: (brandId: string, view: "found" | "catalog" = "found") =>
    `${MARKETING_BRANDS_PATH}/${brandId}/identity/offerings${view === "catalog" ? "?view=catalog" : ""}`,
  /** Open any brand's products and services, or add a brand. */
  offeringsHome: () => "/marketing/brands/offerings",
  brandSection: (brandId: string, section: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/${section}`,
  /** The brand home. `view` = media | media/research | … */
  brandIdentity: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/identity`,
  /** The owner's story sitting (spoken or typed answers; Question Desk story seat). */
  brandOwnerStory: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/identity/story`,
  /** The brand session: the full-screen deck where the person places each brand candidate. */
  brandSession: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/identity/session`,
  /**
   * The brand's asset desk — Library, Research, Sources, Generate — now the
   * Identity section's media room (views are routes; library is the index).
   */
  brandAssets: (
    brandId: string,
    view: MarketingBrandAssetsView = "library",
    brief?: string,
  ) => {
    const base = `${MARKETING_BRANDS_PATH}/${brandId}/identity/media`;
    const path = view === "library" ? base : `${base}/${view}`;
    const brief_ = brief?.trim();
    return brief_ ? `${path}?brief=${encodeURIComponent(brief_)}` : path;
  },
  /** Brand-wide review inbox for discovered assets, properties, and facts. */
  brandDiscovery: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/inbox`,
  /** Brand settings (keyword-value defaults, autonomy — the ladder's brand rung). */
  brandValueSettings: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/settings`,
  /** One brand's locations (Local & Listings). */
  brandLocal: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/locations`,
  /** One canonical location and its publisher-listing workspace. */
  brandLocation: (brandId: string, locationId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/locations/${locationId}`,
  /** One location's Maps rank grid: preview free, then a confirmed paid run. */
  brandLocationGrid: (brandId: string, locationId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/locations/${locationId}/grid`,
  brandWebsites: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/websites`,
  brandSeo: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/seo`,
  brandContentPlan: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/content/plan`,
  brandEmail: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/email`,
  brandPress: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/pr`,
  /** One brand's outreach front door, inside the Press & PR section. */
  brandOutreach: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/pr/outreach`,
  brandAds: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/ads`,
  brandSocials: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/socials`,
  brandCompetitors: (brandId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/intelligence/competitors`,
  brandMonitoring: (brandId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/intelligence/monitoring`,
  /** What AI says about this brand — the brand-level AI-visibility view. */
  brandAiVisibility: (brandId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/intelligence/ai-visibility`,
  /** The tracker editor — one editor for both monitor lenses. */
  brandMonitorSetup: (
    brandId: string,
    opts: { trackerId?: string | null; siteId?: string | null } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.trackerId) params.set("tracker", opts.trackerId);
    if (opts.siteId) params.set("site", opts.siteId);
    const query = params.toString();
    return `${MARKETING_BRANDS_PATH}/${brandId}/intelligence/monitoring/setup${query ? `?${query}` : ""}`;
  },
  /** One news monitor's run view — the address the engine writes into every
   * digest and alert (aidream `services/news/run.py::run_links`). */
  brandMonitorRun: (
    brandId: string,
    trackerId: string,
    opts: { runId?: string | null; storyKey?: string | null } = {},
  ) => {
    const params = new URLSearchParams({ tracker: trackerId });
    if (opts.runId) params.set("run", opts.runId);
    if (opts.storyKey) params.set("story", opts.storyKey);
    return `${MARKETING_BRANDS_PATH}/${brandId}/intelligence/monitoring?${params.toString()}`;
  },
  brandReputation: (brandId: string, siteId?: string) =>
    siteId
      ? `${MARKETING_BRANDS_PATH}/${brandId}/intelligence/reputation/${siteId}`
      : `${MARKETING_BRANDS_PATH}/${brandId}/intelligence/reputation`,
  brandAnalytics: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/analytics`,
  brandInitiatives: (brandId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/planning/initiatives`,

  // ── Website inventory (what the site IS) ──────────────────────────────
  website: (brandId: string, siteId: string, sub = "") =>
    `${MARKETING_BRANDS_PATH}/${brandId}/websites/${siteId}${sub}`,

  // ── SEO practice on one site ──────────────────────────────────────────
  seoSite: (brandId: string, siteId: string, sub = "") =>
    `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}${sub}`,
  siteKeywords: (brandId: string, siteId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/keywords`,
  /** Keyword Workbench, carrying its saved-view/filter query dialect. */
  siteKeywordWorkbench: (
    brandId: string | null | undefined,
    siteId: string,
    query = "",
  ) => {
    const keywordsPath = brandId
      ? `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/keywords`
      : `/marketing/sites/${siteId}/keywords`;
    const path = marketingSubViewHref(keywordsPath, "keywords", "workbench");
    const normalizedQuery = query.startsWith("?") ? query.slice(1) : query;
    return normalizedQuery ? `${path}?${normalizedQuery}` : path;
  },
  siteKeywordValue: (brandId: string, siteId: string, sub = "") =>
    `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/keywords/value${sub}`,
  siteSearchConsole: (brandId: string, siteId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/search-console`,
  siteCapabilities: (brandId: string, siteId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/capabilities`,
  siteReports: (brandId: string, siteId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/reports`,
  /** What agents know about the site, and the door to each fact's editor. */
  siteContext: (brandId: string, siteId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/context`,

  /**
   * Compatibility site base — the pre-restructure workhorse (79 call sites).
   * Splits the legacy section path across the websites/seo branches via
   * `MARKETING_SITE_SECTION_HOMES`, so every old call site emits a NEW
   * canonical URL without being touched. Falls back to the legacy flat shim
   * (`/marketing/sites/[siteId]/…`, which resolves brand + section
   * server-side) when the brand is unknown at the call site.
   */
  site: (brandId: string | null | undefined, siteId: string, sub = "") =>
    brandId
      ? mapLegacySiteSub(brandId, siteId, sub)
      : `/marketing/sites/${siteId}${sub}`,
  /** One configuration destination with durable, linkable Settings views. */
  siteSettings: (
    brandId: string | null | undefined,
    siteId: string,
    view: MarketingSiteSettingsView = "site",
  ) => {
    if (!brandId) {
      const legacy = `/marketing/sites/${siteId}`;
      return view === "site"
        ? `${legacy}/settings`
        : `${legacy}/settings?view=${view}`;
    }
    return marketingSiteSettingsHref(
      `${MARKETING_BRANDS_PATH}/${brandId}/websites/${siteId}`,
      view,
    );
  },
  /** Site-wide internal authority flow: backlinks → crawl graph → priority pages. */
  siteAuthority: (brandId: string | null | undefined, siteId: string) =>
    brandId
      ? `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/authority`
      : `/marketing/sites/${siteId}/authority`,
  /**
   * One canonical page's workspace. THE DOOR LAW's most-linked marketing
   * destination — every surface that resolves a `page_id` reaches the page
   * through this ONE builder. `brandId` optional: rows usually carry only
   * `site_id`; the flat shim resolves the brand and replaces the URL.
   */
  sitePage: (
    brandId: string | null | undefined,
    siteId: string,
    pageId: string,
  ) =>
    brandId
      ? `${MARKETING_BRANDS_PATH}/${brandId}/websites/${siteId}/pages/${pageId}`
      : `/marketing/sites/${siteId}/pages/${pageId}`,
  /** Theory-backed intervention ledger for one site. */
  siteChanges: (
    brandId: string | null | undefined,
    siteId: string,
    changeId?: string,
  ) => {
    const base = brandId
      ? `${MARKETING_BRANDS_PATH}/${brandId}/seo/${siteId}/changes`
      : `/marketing/sites/${siteId}/changes`;
    return changeId ? `${base}?change=${encodeURIComponent(changeId)}` : base;
  },
  crawlReports: (
    brandId: string | null | undefined,
    siteId: string,
    crawlId: string,
  ) =>
    brandId
      ? `${MARKETING_BRANDS_PATH}/${brandId}/websites/${siteId}/crawls/${crawlId}/reports`
      : `/marketing/sites/${siteId}/crawls/${crawlId}/reports`,
  crawlReport: (
    brandId: string | null | undefined,
    siteId: string,
    crawlId: string,
    reportKey: string,
  ) =>
    brandId
      ? `${MARKETING_BRANDS_PATH}/${brandId}/websites/${siteId}/crawls/${crawlId}/reports/${reportKey}`
      : `/marketing/sites/${siteId}/crawls/${crawlId}/reports/${reportKey}`,

  // ── Content plan ──────────────────────────────────────────────────────
  /** Agency-level list door (legacy address; resolves per brand). */
  contentPlan: () => "/marketing/content-plan",
  /**
   * One site's plan workspace. Views are ROUTES now (tree is the index).
   * Without a brand the legacy shim (`/marketing/content-plan/[siteId]`)
   * resolves it — 18 call sites carry only siteId.
   */
  contentPlanSite: (siteId: string, view?: string) =>
    `/marketing/content-plan/${siteId}${view && view !== "tree" ? `?view=${view}` : ""}`,
  brandContentPlanSite: (brandId: string, siteId: string, view?: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/content/plan/${siteId}${view && view !== "tree" ? `/${view}` : ""}`,

  // ── Topical map ───────────────────────────────────────────────────────
  // The map is the Content section's HOME (placement decision 2026-09-16);
  // the content plan above stays exactly where it is and becomes the map's
  // production line.
  /**
   * The Content section's front door: this brand's maps.
   *
   * ⚠️ `/marketing/<brand>/content` was a `permanentRedirect` (HTTP 308) into
   * the content plan until this screen shipped, and browsers cache a 308
   * forever. It is now a 307 forward to `/content/map` (2026-10-21), and this
   * builder emits the `/content/map` form so no link ever takes the hop.
   */
  brandContent: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/content/map`,
  /** The same screen at an address no browser ever cached a 308 for. */
  brandTopicalMapHome: (brandId: string) => `${MARKETING_BRANDS_PATH}/${brandId}/content/map`,
  /** One map's workspace — the outline view, which is the index. */
  brandTopicalMap: (brandId: string, mapId: string) =>
    `${MARKETING_BRANDS_PATH}/${brandId}/content/map/${mapId}`,
  /**
   * One view of one map. Views are ROUTES, not tabs — the same shape the
   * content plan uses — so selection and expansion must live in the topical-map
   * Redux slice, never in component state.
   */
  brandTopicalMapView: (
    brandId: string,
    mapId: string,
    view: "outline" | "table" | "graph" | "text" | "pages" | "history",
    site?: string,
  ) => {
    const base = `${MARKETING_BRANDS_PATH}/${brandId}/content/map/${mapId}`;
    const path = view === "outline" ? base : `${base}/${view}`;
    return site ? `${path}?site=${encodeURIComponent(site)}` : path;
  },
  /**
   * The id door. Resolves the brand and redirects into the workspace; renders
   * standalone read-only when the viewer can read the map but not its brand.
   * This is the value of `platform.shareable_resource_registry.url_path_template`
   * for `seo_topical_map`.
   */
  topicalMapDoor: (mapId: string) => `/marketing/topical-maps/${mapId}`,
  /**
   * The brand-free START door. A research topic belongs to an organization,
   * never to a brand, and a site can lack a brand context at its call site, so
   * this page picks the brand first and then lands on that brand's home in
   * start mode. Every screen that needs it comes here (CONTRACTS §2) — never a
   * hand-built literal.
   */
  topicalMapStart: (options: { source?: string; researchTopicId?: string | null } = {}) => {
    const params = new URLSearchParams();
    if (options.researchTopicId) params.set("research", options.researchTopicId);
    if (options.source) params.set("source", options.source);
    const query = params.toString();
    return query ? `/marketing/topical-maps/start?${query}` : "/marketing/topical-maps/start";
  },

  // ── Legacy shim addresses (resolve + redirect; builders keep them only
  //    where the call site lacks the context for a canonical address) ─────
  /**
   * "All sites" — the retired flat portfolio (`/marketing/sites` only 308s to the brands list now; a website
   * belongs to a brand). Emits the brands list directly so no link takes the hop.
   */
  sites: () => "/marketing/brands",
  /** Cross-site Search Console door; with a site it resolves into the brand tree. */
  searchConsole: (siteId?: string) =>
    siteId
      ? `/marketing/search-console?site=${siteId}`
      : "/marketing/search-console",
  /** Shared catalog of Marketing's SEO measurement capabilities. */
  capabilities: (siteId?: string) =>
    siteId
      ? `/marketing/capabilities?site=${encodeURIComponent(siteId)}`
      : "/marketing/capabilities",
  keywordResearch: () => "/marketing/keyword-research",
  backlinkValuation: () => "/marketing/backlink-valuation",
  press: () => "/marketing/pr",
  local: () => "/marketing/local",
  ranks: () => "/marketing/ranks",
  contentStudio: () => "/marketing/content-studio",
  email: () => "/marketing/email",
  ads: () => "/marketing/ads",
  outreach: () => "/marketing/outreach",
  competitors: () => "/marketing/competitors",
  monitoring: () => "/marketing/monitoring",
  initiatives: () => "/marketing/initiatives",
  calendar: () => "/marketing/calendar",
  audience: () => "/marketing/audience",
};
