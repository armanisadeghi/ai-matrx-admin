import type { ShellIconName } from "@/features/shell/shellIconMap";

/**
 * The Brand WORKSPACE's sections — everything under `/marketing/brands/[brandId]`.
 *
 * A person or team works on one or more brands - usually their own. Every section here
 * is about ONE brand, grouped as Arman laid Marketing out (2026-10-21):
 * "Marketing -> Brand -> Brands have websites, socials, and other things.
 * Then, each of those has things within it." So the brand's properties come
 * first (Websites — with SEO and the content plan, which live per website —
 * Socials, Locations), then Identity, Content, Outreach, Competitors &
 * monitoring, and Settings. The overview, inbox and analytics sit at the top.
 *
 * Coming-soon sections are REAL reserved routes rendering
 * `<MarketingComingSoon>` and stay VISIBLE in the brand sidebar with their tag
 * (Arman's ruling for the brand workspace — a promised section is part of the
 * map, never hidden). Each carries a `marketing.*` row in
 * `lib/coming-soon/registry.ts`.
 *
 * Consumed by the brand sidebar, the brand dashboard, route metadata, and the
 * filesystem drift test — one declaration, every surface.
 */

export const MARKETING_BRAND_SECTION_GROUPS = [
  "Start",
  "Websites",
  "Socials",
  "Locations",
  "Identity",
  "Content",
  "Outreach",
  "Competitors & monitoring",
  "Manage",
] as const;

export type MarketingBrandSectionGroup =
  (typeof MARKETING_BRAND_SECTION_GROUPS)[number];

export interface MarketingBrandSection {
  /** First path segment under `/marketing/brands/[brandId]` ("" = the dashboard). */
  slug: string;
  name: string;
  titlePrefix: string;
  description: string;
  letter: string;
  iconName: ShellIconName;
  group: MarketingBrandSectionGroup;
  exact?: boolean;
  status?: "coming-soon";
  comingSoonId?: string;
  /**
   * Sidebar rows that live under this section's segment but deserve their own
   * row (e.g. Competitors under intelligence/). `slug` stays the segment that
   * owns the filesystem directory; `href` completes the address.
   */
  subPath?: string;
  /**
   * This sub-routed row also names the section's BARE route and any child path
   * no sibling row claims (Socials → Accounts owns `/socials` and the account
   * and post detail pages), for route metadata.
   */
  bareRoute?: boolean;
}

export const MARKETING_BRAND_SECTIONS = [
  {
    slug: "",
    name: "Overview",
    titlePrefix: "Brand Overview",
    description: "This brand at a glance — properties, health, activity.",
    letter: "Bo",
    iconName: "Landmark",
    group: "Start",
    exact: true,
  },
  {
    slug: "inbox",
    name: "Inbox",
    titlePrefix: "Discovery Inbox",
    description:
      "Review machine-found assets, properties, and facts before they join the brand.",
    letter: "In",
    iconName: "Inbox",
    group: "Start",
  },
  {
    slug: "analytics",
    name: "Analytics",
    titlePrefix: "Analytics",
    description:
      "Google Analytics traffic and conversion per website today; the other channels join it as they land.",
    letter: "Ay",
    iconName: "ChartNoAxesColumn",
    group: "Start",
  },
  {
    slug: "websites",
    name: "Websites",
    titlePrefix: "Websites",
    description: "This brand's sites — pages, structure, crawls, settings.",
    letter: "Ws",
    iconName: "Globe",
    group: "Websites",
  },
  {
    slug: "seo",
    name: "SEO",
    titlePrefix: "SEO",
    description:
      "The organic-search practice on this brand's sites — keywords, rankings, technical, links, AI visibility.",
    letter: "Sr",
    iconName: "Search",
    group: "Websites",
  },
  {
    // A website's content plan. The plan is per site; this row opens the
    // picker (or the only site's plan) — the website menu links each site's.
    slug: "content",
    name: "Content plan",
    titlePrefix: "Content Plan",
    description:
      "Plan every URL each website should have — pillars, clusters, briefs, keywords.",
    letter: "Pn",
    iconName: "ListTree",
    group: "Websites",
    subPath: "plan",
  },
  {
    slug: "socials",
    name: "Accounts",
    titlePrefix: "Social Accounts",
    description:
      "Tracked and own social accounts for this brand — track, compare, and open any account.",
    letter: "Sa",
    iconName: "Users",
    group: "Socials",
    subPath: "accounts",
    bareRoute: true,
  },
  {
    slug: "socials",
    name: "Look up",
    titlePrefix: "Social Look Up",
    description:
      "Look up any account, topic, ad or post — what it costs shows before you press.",
    letter: "Lu",
    iconName: "Search",
    group: "Socials",
    subPath: "research",
  },
  {
    slug: "socials",
    name: "Studio",
    titlePrefix: "Social Studio",
    description:
      "The social board — ideas, drafts, and references laid out for this brand.",
    letter: "Sk",
    iconName: "LayoutDashboard",
    group: "Socials",
    subPath: "studio",
  },
  {
    slug: "socials",
    name: "Outliers",
    titlePrefix: "Outliers",
    description:
      "Posts that beat their account's normal — what is working right now.",
    letter: "Ot",
    iconName: "TrendingUp",
    group: "Socials",
    subPath: "outliers",
  },
  {
    slug: "socials",
    name: "Swipe file",
    titlePrefix: "Swipe File",
    description:
      "Saved posts and ads worth learning from, with notes and tags.",
    letter: "Sf",
    iconName: "BookmarkCheck",
    group: "Socials",
    subPath: "swipe",
  },
  {
    slug: "socials",
    name: "Videos",
    titlePrefix: "Videos",
    description: "Clones of outlier and swipe-file videos, with variants.",
    letter: "Sv",
    iconName: "Video",
    group: "Socials",
    subPath: "videos",
  },
  {
    slug: "socials",
    // "Ad library" — competitor ad research; never "Ads" beside the Advertising
    // section (the brand's own ad accounts), which read as the same thing.
    name: "Ad library",
    titlePrefix: "Ad Library",
    description:
      "Ads the tracked accounts are running, from the platforms' ad libraries.",
    letter: "Sj",
    iconName: "Megaphone",
    group: "Socials",
    subPath: "ads",
  },
  {
    slug: "socials",
    name: "KPIs",
    titlePrefix: "Social KPIs",
    description:
      "Followers, growth, and goals for the brand's own accounts.",
    letter: "Kp",
    iconName: "Target",
    group: "Socials",
    subPath: "kpis",
  },
  {
    slug: "locations",
    name: "Locations",
    titlePrefix: "Locations & Listings",
    description:
      "Business locations, Google Business Profiles, directory listings, and reviews.",
    letter: "Lc",
    iconName: "MapPin",
    group: "Locations",
  },
  {
    slug: "identity",
    // Ruling 2026-10-09: the brand's HOME is Overview (the root row, labeled with
    // the brand's name). This room is the brand's Identity — never a second "home".
    name: "Identity",
    titlePrefix: "Brand Identity",
    description:
      "Who this brand is: media and assets today; guides, kit, offerings, and audience as they come home.",
    letter: "Id",
    iconName: "BadgeCheck",
    group: "Identity",
  },
  {
    // One home under Identity (Arman, 2026-10-21); `/offerings` forwards here.
    slug: "identity",
    name: "Products & services",
    titlePrefix: "Products & Services",
    description: "What this brand sells — the products and services Smart Add found, and the tree behind them.",
    letter: "Pq",
    iconName: "Package",
    group: "Identity",
    subPath: "offerings",
  },
  {
    slug: "content",
    name: "Topical maps",
    titlePrefix: "Content",
    description:
      "The topical map: which pages this brand should have and where they live. The content plan produces what it calls for.",
    letter: "Tm",
    iconName: "Network",
    group: "Content",
    // ⚠️ `/marketing/brands/<brand>/content` answered with `permanentRedirect` (HTTP
    // 308) into the content plan until the map took that slot on 2026-09-16,
    // and browsers cache a 308 indefinitely. Pointing this row at the
    // `content/map` address means the sidebar never exercises anyone's cached
    // redirect; `/content` itself still renders the same screen.
    subPath: "map",
  },
  {
    slug: "planning",
    name: "Planning",
    titlePrefix: "Planning",
    description:
      "Initiatives — the container above channels — and the marketing calendar.",
    letter: "Pl",
    iconName: "Target",
    group: "Content",
  },
  {
    slug: "pr",
    name: "Press & PR",
    titlePrefix: "Press Room",
    description:
      "What is genuinely newsworthy about this brand, the proof, and the journalists to pitch.",
    letter: "Pr",
    iconName: "Newspaper",
    group: "Outreach",
  },
  {
    slug: "pr",
    name: "Outreach",
    titlePrefix: "Outreach",
    description:
      "Link and PR prospecting, sequenced contact, and earned-placement tracking.",
    letter: "Ou",
    iconName: "Send",
    group: "Outreach",
    subPath: "outreach",
  },
  {
    // The PR calendar lives on the reserved Planning calendar route; a PR person
    // looks for it beside the Press Room and Outreach, so it is listed here.
    slug: "planning",
    name: "PR Calendar",
    titlePrefix: "PR Calendar",
    description:
      "The sourced moments worth pitching over the next six months, with pitch windows for every kind of outlet.",
    letter: "Cy",
    iconName: "CalendarDays",
    group: "Outreach",
    subPath: "calendar",
  },
  {
    slug: "email",
    name: "Email",
    titlePrefix: "Email",
    description:
      "The mailbox you send from, the templates you send, and the sequences that send them.",
    letter: "Em",
    iconName: "Mail",
    group: "Outreach",
  },
  {
    slug: "ads",
    name: "Advertising",
    titlePrefix: "Advertising",
    description:
      "Ad accounts, campaigns, creative, and budgets across Google, Meta, and LinkedIn.",
    letter: "Az",
    iconName: "BadgeDollarSign",
    group: "Outreach",
  },
  {
    slug: "intelligence",
    name: "Competitors",
    titlePrefix: "Competitors",
    description:
      "Tracked rivals, share of voice, keyword and content gaps, and their movement.",
    letter: "Cm",
    iconName: "Swords",
    group: "Competitors & monitoring",
    subPath: "competitors",
  },
  {
    slug: "intelligence",
    name: "Monitoring",
    titlePrefix: "Monitoring",
    description:
      "Who wrote about this brand, what happened to its links, and whether the answer engines cite it.",
    letter: "Mo",
    iconName: "Radar",
    group: "Competitors & monitoring",
    subPath: "monitoring",
  },
  {
    slug: "intelligence",
    name: "What AI says",
    titlePrefix: "What AI says",
    description:
      "How the answer engines talk about this brand, and its share of voice against its competitors.",
    letter: "AI",
    iconName: "SearchCheck",
    group: "Competitors & monitoring",
    subPath: "ai-visibility",
  },
  {
    slug: "intelligence",
    name: "Reputation",
    titlePrefix: "Reputation",
    description:
      "Evidence-backed publication opportunities and reputation handling decisions.",
    letter: "Ru",
    iconName: "ShieldCheck",
    group: "Competitors & monitoring",
    subPath: "reputation",
  },
  {
    slug: "settings",
    name: "Settings",
    titlePrefix: "Brand Settings",
    description:
      "Keyword-value defaults, autonomy modes, and brand-level configuration.",
    letter: "St",
    iconName: "Settings",
    group: "Manage",
  },
] as const satisfies readonly MarketingBrandSection[];

export interface MarketingBrandMode extends MarketingBrandSection {
  href: string;
}

export function listMarketingBrandModes(
  brandPath: string,
): MarketingBrandMode[] {
  return MARKETING_BRAND_SECTIONS.map((section) => {
    const path = "subPath" in section && section.subPath
      ? `${section.slug}/${section.subPath}`
      : section.slug;
    return {
      ...section,
      href: path ? `${brandPath}/${path}` : brandPath,
    };
  });
}

export interface MarketingBrandModeGroup {
  label: MarketingBrandSectionGroup;
  modes: MarketingBrandMode[];
}

export function listMarketingBrandModeGroups(
  brandPath: string,
): MarketingBrandModeGroup[] {
  const modes = listMarketingBrandModes(brandPath);
  return MARKETING_BRAND_SECTION_GROUPS.map((label) => ({
    label,
    modes: modes.filter((mode) => mode.group === label),
  })).filter((group) => group.modes.length > 0);
}

/**
 * Route-backed promises that live BELOW a brand section rather than being a
 * section themselves (each is a real reserved route under `/marketing/[brand]`
 * rendering `<MarketingComingSoon>`). Declared here so the coming-soon drift
 * test can prove every marketing registry row is rendered somewhere.
 */
export const MARKETING_BRAND_SUBROUTE_PROMISES: readonly {
  comingSoonId: string;
  subRoute: string;
}[] = [
  // The route renders the PR calendar today; the cross-channel timeline it promises is
  // still unbuilt and is announced on that page (features/marketing/pr/calendar).
  { comingSoonId: "marketing.calendar", subRoute: "planning/calendar" },
  { comingSoonId: "marketing.content-studio", subRoute: "content/studio" },
  // The ad CENTER (campaigns, creative, budgets across providers) is still a
  // promise; the live Google Ads workspace is its first room at `ads`.
  { comingSoonId: "marketing.ads", subRoute: "ads" },
  // Socials: Accounts, Outliers, Swipe file, Ad library, KPIs and the detail pages are live; the umbrella
  // row is still being built.
  { comingSoonId: "marketing.social", subRoute: "socials" },
];

/**
 * Segments under `/marketing/brands/[brandId]` that only forward to a section's home
 * (an old address kept working). Never a menu row.
 */
export const MARKETING_BRAND_FORWARD_SEGMENTS = [
  // Products & services moved under Identity (Arman, 2026-10-21).
  "offerings",
] as const;

/** The unique filesystem segments under `/marketing/brands/[brandId]` (drift test). */
export function listMarketingBrandSegments(): string[] {
  return [
    ...new Set([
      ...MARKETING_BRAND_SECTIONS.map((section) => section.slug).filter(Boolean),
      ...MARKETING_BRAND_FORWARD_SEGMENTS,
    ]),
  ].sort();
}
