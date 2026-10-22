/**
 * PER-PAGE SEO CHECKS — the browser half of the ONE verdict layer.
 *
 * EXACT mirror of the check section of aidream
 * `packages/matrx-scraper/matrx_scraper/seo_audit.py` (`PageEvidence`,
 * `CheckOutcome`, every `check_*`, `PAGE_CHECKS` / `run_page_checks`).
 * Statuses, scores, issue counts, evidence payloads, AND the reasoning
 * strings are byte-identical: a reasoning sentence is a user-facing expert
 * explanation, so the same page must never be explained two different ways
 * depending on which side computed it.
 *
 * 🚨 CHANGE ONE → CHANGE BOTH IN THE SAME UNIT OF WORK. A threshold, a
 * status boundary, or a single word of reasoning changed here must land in
 * `matrx_scraper/seo_audit.py` in the same commit, and the parity fixture
 * must be regenerated:
 *
 *     .venv/bin/python packages/matrx-scraper/scripts/generate_page_checks_parity_fixture.py
 *
 * `checks.parity.test.ts` fails if you forget.
 *
 * The evidence↔verdict split is the point: a check NEVER parses HTML and
 * never touches the network or a database, so the same function serves a
 * live one-shot audit in the browser, a stored-snapshot render, and the
 * server's crawl pipeline. Metrics (pixel widths, indexability) come from
 * their canonical owners — `../serp/metrics` and `./indexability` — and the
 * SERP length limits are IMPORTED, never redeclared.
 */

import { evaluateMetaDescription, evaluateMetaTitle } from "../serp/metrics";
import type { StoredMetaFieldMetrics } from "../serp/metrics";

// ---------------------------------------------------------------------------
// Thresholds — every decision boundary, declared exactly once.
// Mirrors of the CAPS constants in `seo_audit.py`.
// ---------------------------------------------------------------------------

/**
 * Thin content, in words of audited visible text. Screaming Frog's "low
 * content" default is 200 words; the thin_content contract bands are
 * <50 -> 20, 50-149 -> 45, 150-299 -> 70, 300+ -> 100.
 */
export const CONTENT_OK_WORDS = 300;
export const CONTENT_WARN_WORDS = 150;
export const CONTENT_FAIL_WORDS = 50;

// `url_design_quality` — the deduction formula from its live catalog row.
export const URL_DESIGN_MAX_LENGTH = 115;
export const URL_DESIGN_MAX_PARAMS = 2;
export const URL_DESIGN_LONG_PENALTY = 15;
export const URL_DESIGN_MANY_PARAMS_PENALTY = 15;
export const URL_DESIGN_UPPERCASE_PENALTY = 10;
export const URL_DESIGN_UNDERSCORE_PENALTY = 10;
export const URL_DESIGN_NON_ASCII_PENALTY = 10;
export const URL_DESIGN_SESSION_PARAM_PENALTY = 25;
export const URL_DESIGN_SESSION_PARAM_NAMES: ReadonlySet<string> = new Set([
  "aspsessionid",
  "jsessionid",
  "phpsessid",
  "session",
  "sessionid",
  "sid",
]);

/** Missing image alt escalates from warn to fail at either bound. */
export const IMAGE_ALT_FAIL_RATIO = 0.5;
export const IMAGE_ALT_FAIL_COUNT = 10;

// --- Images & media --------------------------------------------------------
// Every one of these bands maps to a rule in the `web.analysis_item` row's
// `score_contract`; the row is the spec, these constants are its only home.

/** Raster formats worth converting, and the modern targets to convert them to. */
export const IMAGE_MODERN_RASTER_FORMATS: ReadonlySet<string> = new Set([
  "avif",
  "webp",
]);
export const IMAGE_LEGACY_RASTER_FORMATS: ReadonlySet<string> = new Set([
  "bmp",
  "gif",
  "jpg",
  "png",
  "tif",
]);

/** Share of images that must declare width/height before the page is clean. */
export const IMAGE_DIMENSION_ATTR_PASS_COVERAGE = 0.9;
export const IMAGE_DIMENSION_ATTR_FAIL_COVERAGE = 0.5;

/** Share of convertible raster IMAGES — count-weighted, see checkImageModernFormat. */
export const IMAGE_MODERN_FORMAT_PASS_COVERAGE = 0.9;
export const IMAGE_MODERN_FORMAT_FAIL_COVERAGE = 0.5;

/**
 * Fold geometry is NOT captured, so DOM order stands in for it: the first N
 * <img> elements are treated as likely above-the-fold.
 */
export const IMAGE_ABOVE_FOLD_DOM_COUNT = 3;
export const IMAGE_BELOW_FOLD_EAGER_FAIL_RATIO = 0.5;

/**
 * Oversizing, in declared-intrinsic-width / declared-display-width. A 2x ratio
 * is CORRECT (retina), so the bands start above the DPR headroom.
 */
export const IMAGE_OVERSIZE_MINOR_RATIO = 2.0;
export const IMAGE_OVERSIZE_MAJOR_RATIO = 4.0;
export const IMAGE_OVERSIZE_SEVERE_RATIO = 8.0;
export const IMAGE_OVERSIZE_WARN_BYTES = 300 * 1024;
export const IMAGE_OVERSIZE_FAIL_BYTES = 1024 * 1024;

/** Broken images: the row's own band — 3+ is a page that looks abandoned. */
export const BROKEN_IMAGE_FAIL_COUNT = 3;

/** Extensions `imageFormat` recognizes, and the spellings it folds together. */
const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  "apng",
  "avif",
  "bmp",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);
const IMAGE_FORMAT_ALIASES: Record<string, string> = {
  jpeg: "jpg",
  tiff: "tif",
};

/**
 * Redirects: hops BEYOND the first are the waste. >2 entries in the chain
 * means the crawler followed more than one hop to land.
 */
export const REDIRECT_CHAIN_MAX_HOPS = 2;

/**
 * Weight ceiling for the HTML DOCUMENT — the only transfer size the crawl
 * measures. Subresource bytes (images, scripts, fonts) are NOT fetched, so
 * there is no total-page-weight number here and the catalog row says so.
 */
export const LARGE_PAGE_BYTES = 5_000_000;

/**
 * TTFB bands, straight from the `ttfb_server_response` row's score_contract
 * and from Google's server-response-time audit: at or under 800 ms is good,
 * over 1800 ms is poor. These grade TRUE time-to-first-byte (`ttfbMs`), never
 * total response time — a fast server behind a slow download must not be
 * scored as slow, and the reverse is worse.
 */
export const TTFB_GOOD_MS = 800;
export const TTFB_POOR_MS = 1_800;
/** A TTFB sample older than this is not graded (stale evidence). */
export const TTFB_MAX_AGE_DAYS = 30;

// --- Mobile rendering, language, social ------------------------------------

/**
 * Viewport zoom lockout. A `maximum-scale` at or below this pins the page at
 * its initial scale — the same WCAG 1.4.4 failure `user-scalable=no` causes.
 */
export const VIEWPORT_ZOOM_LOCK_MAX_SCALE = 1.0;
/** Values of `user-scalable` that disable pinch-zoom. */
export const VIEWPORT_ZOOM_DISABLED_VALUES: ReadonlySet<string> = new Set([
  "no",
  "0",
  "false",
]);

/**
 * Formats the social-share crawlers actually render. Anything else (svg, bmp,
 * ico, tiff) is fetched and then dropped, so the share renders imageless.
 */
export const OG_IMAGE_SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
]);

/** The Open Graph tags a rich share preview requires, per the catalog row. */
export const SOCIAL_REQUIRED_OG_TAGS = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
] as const;
/** Deductions from the tag-coverage score — the catalog row's formula, verbatim. */
export const SOCIAL_OG_URL_CONFLICT_PENALTY = 20;
export const SOCIAL_NO_TWITTER_CARD_PENALTY = 10;
/** Score bands the coverage formula maps to a status. */
export const SOCIAL_META_PASS_SCORE = 100;
export const SOCIAL_META_WARN_SCORE = 60;

/**
 * A meta refresh at or below this delay is an outright HTTP-redirect
 * substitute; above it the page is an interstitial the user actually sees.
 */
export const META_REFRESH_INSTANT_MAX_SECONDS = 0;

/**
 * HTTP-variant probe verdicts for `https_enforcement`. A permanent redirect is
 * the only answer that consolidates the duplicate.
 */
export const HTTP_VARIANT_PERMANENT_REDIRECTS: ReadonlySet<number> = new Set([
  301, 308,
]);

// --- Outline, depth, and error-page detection ------------------------------

/**
 * `heading_hierarchy` — a "skip" is a jump of more than one level between two
 * consecutive headings (h2 → h4).
 */
export const HEADING_SKIP_FAIL_COUNT = 3;
export const HEADING_EMPTY_FAIL_RATIO = 0.3;

/** `text_html_ratio` — extracted visible-text bytes / raw HTML bytes. */
export const TEXT_HTML_RATIO_FAIL = 0.03;
export const TEXT_HTML_RATIO_WARN = 0.1;

/**
 * `content_depth` — per-TYPE word expectations, the analytics counterpart to
 * `thin_content`'s absolute floor. Only evaluated when the page declares a
 * type; an unknown type is `n_a`, never a second thin-content verdict.
 */
export const CONTENT_DEPTH_ARTICLE_MIN_WORDS = 500;
export const CONTENT_DEPTH_ARTICLE_TARGET_WORDS = 900;
export const CONTENT_DEPTH_COMMERCE_MIN_WORDS = 100;
/** schema.org @type values (lowercased) that carry a long-form expectation. */
export const CONTENT_DEPTH_ARTICLE_SCHEMA_TYPES: ReadonlySet<string> = new Set([
  "article",
  "advertisercontentarticle",
  "blogposting",
  "liveblogposting",
  "newsarticle",
  "report",
  "scholarlyarticle",
  "socialmediaposting",
  "techarticle",
]);
/** Commerce/listing types — a short page is normal, an EMPTY one is not. */
export const CONTENT_DEPTH_COMMERCE_SCHEMA_TYPES: ReadonlySet<string> = new Set(
  [
    "collectionpage",
    "individualproduct",
    "itemlist",
    "offercatalog",
    "product",
    "productgroup",
    "productmodel",
  ],
);
/** Types with no content expectation at all — exempt, per the catalog row. */
export const CONTENT_DEPTH_UTILITY_SCHEMA_TYPES: ReadonlySet<string> = new Set([
  "aboutpage",
  "checkoutpage",
  "contactpage",
  "profilepage",
  "searchresultspage",
]);

/** `soft_404_detection` — a 200 that serves error content. */
export const SOFT_404_PHRASE_MAX_WORDS = 50;
export const SOFT_404_EMPTY_MAX_WORDS = 30;
/**
 * Not-found phrasing in a TITLE. Deliberately narrow — an article titled
 * "What to do when a page is missing" must not be called a soft 404.
 */
export const SOFT_404_TITLE_PATTERN =
  /\b(404|page not found|not found|no longer (?:exists|available)|page (?:does not|doesn'?t) exist|page unavailable|error 404)\b/i;

/** `temporary_redirect_usage` — statuses that should have been 301/308. */
export const TEMPORARY_REDIRECT_STATUSES: ReadonlySet<number> = new Set([
  302, 307,
]);

/** How many offending URLs a check attaches as evidence. */
export const CHECK_EVIDENCE_SAMPLE_LIMIT = 5;

// --- Structured data -------------------------------------------------------

/** Properties Google REQUIRES for a rich result of this type. */
export const RICH_RESULT_REQUIRED_PROPERTIES: Record<
  string,
  readonly string[]
> = {
  Article: ["headline"],
  NewsArticle: ["headline"],
  BlogPosting: ["headline"],
  BreadcrumbList: ["itemListElement"],
  Course: ["name", "description", "provider"],
  Event: ["name", "startDate", "location"],
  FAQPage: ["mainEntity"],
  HowTo: ["name", "step"],
  JobPosting: ["title", "datePosted", "hiringOrganization", "jobLocation"],
  LocalBusiness: ["name", "address"],
  Product: ["name", "offers"],
  QAPage: ["mainEntity"],
  Recipe: ["name", "image"],
  Review: ["itemReviewed", "reviewRating", "author"],
  SoftwareApplication: ["name", "offers"],
  VideoObject: ["name", "thumbnailUrl", "uploadDate"],
};

/** Properties Google recommends — absent, the rich result renders with less. */
export const RICH_RESULT_RECOMMENDED_PROPERTIES: Record<
  string,
  readonly string[]
> = {
  Article: ["image", "author", "datePublished", "dateModified", "publisher"],
  NewsArticle: [
    "image",
    "author",
    "datePublished",
    "dateModified",
    "publisher",
  ],
  BlogPosting: ["image", "author", "datePublished", "dateModified"],
  Course: ["url", "image"],
  Event: ["description", "endDate", "image", "offers", "performer"],
  HowTo: ["image", "totalTime", "supply", "tool"],
  JobPosting: ["description", "baseSalary", "employmentType", "validThrough"],
  LocalBusiness: [
    "telephone",
    "openingHours",
    "geo",
    "url",
    "image",
    "priceRange",
  ],
  Organization: ["url", "logo", "sameAs", "contactPoint"],
  Product: ["image", "description", "brand", "aggregateRating", "sku"],
  Recipe: [
    "author",
    "datePublished",
    "description",
    "recipeIngredient",
    "recipeInstructions",
    "cookTime",
  ],
  Review: ["datePublished"],
  SoftwareApplication: [
    "aggregateRating",
    "applicationCategory",
    "operatingSystem",
  ],
  // Google accepts embedUrl OR contentUrl; `contentUrl` stands for either
  // (see SCHEMA_PROPERTY_ALIASES), so it is listed once.
  VideoObject: ["description", "duration", "contentUrl"],
};

/**
 * Spellings schema.org accepts for the SAME fact. A page that declares
 * `openingHoursSpecification` has stated its opening hours; calling that
 * "missing" is the check being wrong, not the page.
 */
export const SCHEMA_PROPERTY_ALIASES: Record<string, readonly string[]> = {
  address: ["address", "location"],
  contentUrl: ["contentUrl", "embedUrl"],
  author: ["author", "creator"],
  image: ["image", "thumbnailUrl", "photo"],
  openingHours: ["openingHours", "openingHoursSpecification"],
  offers: ["offers", "aggregateRating", "review"],
  step: ["step", "steps"],
  telephone: ["telephone", "phone"],
};

/** schema.org LocalBusiness subtypes common enough to be worth naming. */
export const LOCAL_BUSINESS_SUBTYPES: ReadonlySet<string> = new Set([
  "AccountingService",
  "Attorney",
  "AutoDealer",
  "AutoRepair",
  "AutomotiveBusiness",
  "BankOrCreditUnion",
  "Bar",
  "BeautySalon",
  "CafeOrCoffeeShop",
  "ChildCare",
  "DaySpa",
  "Dentist",
  "DiagnosticLab",
  "DryCleaningOrLaundry",
  "Electrician",
  "EmergencyService",
  "EmploymentAgency",
  "EntertainmentBusiness",
  "FinancialService",
  "FoodEstablishment",
  "GeneralContractor",
  "GovernmentOffice",
  "HVACBusiness",
  "HairSalon",
  "HealthAndBeautyBusiness",
  "HealthClub",
  "HomeAndConstructionBusiness",
  "Hospital",
  "Hotel",
  "HousePainter",
  "IndividualPhysician",
  "InsuranceAgency",
  "LegalService",
  "Library",
  "Locksmith",
  "LodgingBusiness",
  "MedicalBusiness",
  "MedicalClinic",
  "MovingCompany",
  "NailSalon",
  "Notary",
  "Optician",
  "Pharmacy",
  "Physician",
  "Plumber",
  "ProfessionalService",
  "RadioStation",
  "RealEstateAgent",
  "Restaurant",
  "RoofingContractor",
  "SelfStorage",
  "ShoppingCenter",
  "SportsActivityLocation",
  "Store",
  "TattooParlor",
  "TelevisionStation",
  "TouristInformationCenter",
  "TravelAgency",
  "VeterinaryCare",
  "Winery",
]);

/** How many offending values a structured-data check attaches as evidence. */
export const STRUCTURED_DATA_EVIDENCE_LIMIT = 5;

/** How much of a malformed JSON-LD script is quoted back to the user. */
export const MALFORMED_SCRIPT_SNIPPET_CHARS = 200;

// --- International ---------------------------------------------------------

/** The reserved hreflang value for the fallback page — not a language tag. */
export const HREFLANG_DEFAULT_VALUE = "x-default";

// --- Lab performance (PageSpeed Insights) ----------------------------------

/** cwv_lcp — Google's Core Web Vitals thresholds, in milliseconds. */
export const LCP_GOOD_MS = 2_500;
export const LCP_POOR_MS = 4_000;
/** Milliseconds of LCP above `LCP_POOR_MS` that cost one point. */
export const LCP_POOR_MS_PER_POINT = 200;

/** cwv_inp_tbt — Total Blocking Time, the lab proxy for INP. */
export const TBT_GOOD_MS = 200;
export const TBT_POOR_MS = 600;
export const TBT_POOR_MS_PER_POINT = 50;

/** Interaction to Next Paint (real-visitor field data), Google's thresholds. */
export const INP_GOOD_MS = 200;
export const INP_POOR_MS = 500;
export const INP_POOR_MS_PER_POINT = 50;

/** cwv_cls — unitless layout-shift score. */
export const CLS_GOOD = 0.1;
export const CLS_POOR = 0.25;
/** CLS above `CLS_POOR` is multiplied by this before being deducted. */
export const CLS_POOR_PENALTY_PER_UNIT = 100;

/** The bands a good / needs-improvement measurement is scored within. */
export const CWV_GOOD_BAND: readonly [number, number] = [90, 100];
export const CWV_MID_BAND: readonly [number, number] = [50, 89];
export const CWV_POOR_CEILING = 49;

/** asset_delivery — estimated savings, in milliseconds. */
export const DELIVERY_SAVINGS_GOOD_MS = 250;
export const DELIVERY_SAVINGS_POOR_MS = 1_500;
export const DELIVERY_POOR_MS_PER_POINT = 100;
export const DELIVERY_POOR_FLOOR = 10;

/** caching_policy — a static asset is "well cached" at or above this lifetime. */
export const CACHE_WELL_CACHED_MIN_MS = 30 * 24 * 60 * 60 * 1_000;
/** Below this many static bytes, caching is not a meaningful lever. */
export const CACHE_NEGLIGIBLE_STATIC_BYTES = 10_000;

/** A measurement older than this is stale evidence, not today's truth. */
export const LAB_PERFORMANCE_MAX_AGE_DAYS = 30;

/** Status bands shared by the performance checks, applied to the final score. */
export const PERFORMANCE_PASS_SCORE = 90;
export const PERFORMANCE_WARN_SCORE = 50;

/** Lighthouse audit id → the same defect stated for a non-technical reader. */
const DELIVERY_AUDIT_LABELS: Record<string, string> = {
  "render-blocking-insight": "files that block the page from drawing",
  "document-latency-insight": "a slow or uncompressed first response",
  "image-delivery-insight": "images sent larger than they are shown",
  "legacy-javascript-insight": "code shipped twice for old browsers",
  "duplicated-javascript-insight": "the same code included more than once",
  "font-display-insight": "fonts that hide text while they load",
  "unminified-css": "styling files sent uncompacted",
  "unminified-javascript": "code files sent uncompacted",
  "unused-css-rules": "styling rules this page never uses",
  "unused-javascript": "code this page never runs",
};

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * A persisted meta-field metrics payload, as written by either side.
 * Every key is optional because a snapshot may predate a field; the Python
 * reads them with `.get()` for exactly the same reason. `title_ok` /
 * `description_ok` are the pre-`ok` names still present in stored rows.
 */
export type CheckMetaMetrics = Partial<StoredMetaFieldMetrics> & {
  title_ok?: boolean;
  description_ok?: boolean;
};

export interface RedirectHop {
  url?: string | null;
  status?: number | null;
}

/** One entry of `web.snapshot.headings.all`. */
export interface HeadingEvidenceItem {
  level?: unknown;
  text?: unknown;
}

/** One entry of `web.snapshot.images.items`, in DOM order. */
export interface PageImageItem {
  src?: string | null;
  srcset?: string[];
  srcset_widths?: number[];
  picture_formats?: string[];
  sizes?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  loading?: string | null;
  featured?: boolean;
  http_status?: number | null;
  /** Response content type of the image fetch, when captured. */
  content_type?: string | null;
  /** Transfer bytes, decoded size and format from the bounded image capture. */
  bytes?: number | null;
  natural_width?: number | null;
  natural_height?: number | null;
  final_url?: string | null;
  actual_format?: string | null;
  capture_status?: string | null;
  /** Placed by a lazy-loading script (`data-src` and kin). */
  js_lazy?: boolean;
  /** Markup that only exists with JavaScript off. */
  in_noscript?: boolean;
  /** `header` / `footer` / `content`, from the capture. */
  region?: string | null;
  [key: string]: unknown;
}

/** One under-cached asset PageSpeed flagged. */
export interface CacheShortTtlResource {
  url?: unknown;
  cache_lifetime_ms?: unknown;
  total_bytes?: unknown;
  [key: string]: unknown;
}

/**
 * One PageSpeed Insights observation, reduced to what the checks score —
 * mirror of Python's `LabPerformance`. Every field is null when PageSpeed did
 * not report it, and every check must answer `n_a` for a null.
 */
export interface LabPerformance {
  strategy: string;
  /** ISO 8601 instant; null when the store recorded no timestamp. */
  observedAt?: string | null;
  lcpMs?: number | null;
  tbtMs?: number | null;
  cls?: number | null;
  /** Estimated total savings across the delivery fix-list, milliseconds. */
  deliverySavingsMs?: number | null;
  /** Per-audit `{name: savings_ms}` — the offender list behind that total. */
  deliveryAudits?: Record<string, number>;
  /** Total transferred bytes of cacheable static assets; null = not reported. */
  cacheStaticBytes?: number | null;
  cacheShortTtlResources?: CacheShortTtlResource[];
  /**
   * `{host: transferred_bytes}` of the static assets, when the provider
   * recorded it — lets the caching check judge first-party files only.
   */
  cacheStaticBytesByHost?: Record<string, number>;
  /** True when the provider cut its under-cached list short (count is a floor). */
  cacheListTruncated?: boolean;
  /**
   * Real-visitor (CrUX) field data keyed `lcp_ms` / `inp_ms` / `cls`; `level`
   * is "page" or "origin". Graded ahead of the lab estimate when present.
   */
  fieldMetrics?: Record<string, FieldMetric>;
}

/** One real-visitor (CrUX) metric — Python `LabPerformance.field_metrics` entry. */
export interface FieldMetric {
  value: number;
  category?: string | null;
  level?: string | null;
}

/**
 * Everything a per-page check needs, from ANY source — a live audit or a
 * persisted snapshot row. A missing/null field means "not captured": every
 * check must answer `n_a` for it, NEVER a silent pass.
 */
export interface PageEvidence {
  url: string;
  title?: string | null;
  titleMetrics?: CheckMetaMetrics;
  description?: string | null;
  descriptionMetrics?: CheckMetaMetrics;
  metaRobots?: string | null;
  canonicalUrl?: string | null;
  canonicalMatches?: boolean | null;
  noindex?: boolean | null;
  nofollow?: boolean | null;
  h1Count?: number | null;
  /**
   * Every heading in document order — `web.snapshot.headings.all`. Null =
   * never captured (the outline checks answer n_a); `[]` = captured, and the
   * page genuinely has no headings.
   */
  headings?: HeadingEvidenceItem[] | null;
  wordCount?: number | null;
  /** UTF-8 bytes of the visible text `wordCount` counts. */
  textBytes?: number | null;
  /** schema.org @type values the page declares; null = never captured. */
  schemaTypes?: string[] | null;
  imageCount?: number | null;
  imagesMissingAlt?: number | null;
  /** `<a href>` links on the page (`links_summary.total`); null = never captured. */
  linkCount?: number | null;
  /** The internal ones among them (`links_summary.internal`). */
  internalLinkCount?: number | null;
  /**
   * App-shell markup facts (`snapshot.extracted.app_shell`): an app mount point
   * and an executable script. Null = the snapshot predates the capture, so the
   * shell fact is unknown and nothing is silenced.
   */
  appRoot?: boolean | null;
  executableScript?: boolean | null;
  /** Body words outside script/style/template, measured on shell-marked pages. */
  appShellWords?: number | null;
  /**
   * Per-<img> inventory in DOM order, capped while `imageCount` stays the true
   * total. Empty with a non-zero `imageCount` means the snapshot predates the
   * inventory, which every image check must answer `n_a` for.
   */
  imageItems?: PageImageItem[];
  httpStatus?: number | null;
  /**
   * Set when the crawler was KEPT OUT of this URL rather than seeing it fail
   * (`cloudflare_block`, `blocked`, `RateLimited`, `RateLimitTimeout`). The
   * transport checks answer n_a naming the block: a wall is a crawl state,
   * never a broken page.
   */
  fetchBlockedReason?: string | null;
  redirectChain?: RedirectHop[];
  mixedContent?: string[];
  /**
   * Security-relevant response headers, lower-cased. Null = the capture never
   * recorded headers; `{}` = it did and the server sent none of them.
   */
  responseHeaders?: Record<string, string> | null;
  /**
   * Result of probing this URL's http:// variant — {status, location}. Null =
   * never probed, which checkHttpsEnforcement answers n_a for.
   */
  httpVariantProbe?: Record<string, unknown> | null;
  /**
   * Transfer size of the HTML DOCUMENT only — subresources are never fetched,
   * so this is NOT total page weight (see checkPageWeight).
   */
  responseBytes?: number | null;
  /**
   * Total elapsed time of the fetch: server think time PLUS the body
   * download. Recorded for the record; NOT what the TTFB check grades.
   */
  responseTimeMs?: number | null;
  /**
   * TRUE time to first byte, in ms, measured by the transport, redirect hops
   * included. Null/undefined = never measured (snapshots captured before
   * 2026-08-09, and anything fetched through the browser transport).
   * checkTtfbServerResponse answers n_a for those; it must NEVER fall back to
   * responseTimeMs, which measures a different thing.
   */
  ttfbMs?: number | null;
  /** ISO 8601 instant `ttfbMs` was measured; a sample older than `TTFB_MAX_AGE_DAYS` is not graded. */
  ttfbMeasuredAt?: string | null;
  /**
   * {prev, next} from rel=prev/next link tags. Empty = the page declares no
   * pagination, which is NOT a defect (see checkPaginationMarkup).
   */
  pagination?: Record<string, unknown>;
  /** hreflang annotations as [{lang, href}], exactly as persisted. */
  hreflang?: Record<string, unknown>[];
  /**
   * The COMPLETE structured-data payload. Empty = never captured (n_a), which
   * is a different fact from "captured, and the page has no markup".
   */
  structuredData?: Record<string, unknown>;
  /**
   * True once an HTML <head> was actually parsed for this page. A URL the
   * crawler attempted but never snapshotted has NO head evidence, so every
   * head check answers n_a instead of reporting a tag as missing on markup
   * nobody ever read.
   */
  headCaptured?: boolean;
  /** `<html lang>` verbatim; empty when the page declares none. */
  lang?: string | null;
  /** Raw social tag bags, keys exactly as authored ("og:title"). */
  og?: Record<string, string> | null;
  twitter?: Record<string, string> | null;
  /**
   * {viewport, refresh} — the two head metas that are neither SEO text nor
   * transport. Null = the snapshot predates this capture.
   */
  headMeta?: Record<string, unknown> | null;
  /**
   * Lab performance from the ONE PageSpeed store. Null = PageSpeed has never
   * run for this page, which every Core Web Vitals check answers `n_a` +
   * COLLECT_PAGESPEED for — NEVER a pass.
   */
  labPerformance?: LabPerformance | null;
}

export type CheckStatus = "pass" | "warn" | "fail" | "n_a";

/**
 * A verdict. `score` is 1-100 for pass/warn/fail and null otherwise — the
 * shape `web.analysis_result`'s status/score constraint requires.
 */
/**
 * The ONE-CLICK FIX for a check that could not run yet — the browser mirror of
 * Python's `seo_audit.Remediation`.
 *
 * A check that answers `n_a` because EVIDENCE IS MISSING attaches one of these
 * and NEVER tells the user to run something in prose (NO DEAD ENDS doctrine).
 * `command` names a crawler command the platform already performs;
 * `features/marketing/crawler/remediation.ts` maps it to the existing
 * direct-client call.
 */
export interface Remediation {
  /** Existing crawler command key. */
  command:
    | "links_check"
    | "page_fetch"
    | "site_recrawl"
    | "sitemaps_sync"
    | "pagespeed_collect"
    | "gsc_sync";
  /** "site" (one command covers the whole site) | "page" (this page only). */
  scope: "site" | "page";
  /** The button's verb, in the user's language. */
  label: string;
  /** What will happen, stated BEFORE it happens. */
  explainer: string;
}

export const CHECK_SITE_LINKS: Remediation = {
  command: "links_check",
  scope: "site",
  label: "Check this site's links",
  explainer:
    "We follow every link on the site once and record which ones are broken " +
    "or bounce through a redirect. It runs across the whole site, so it only " +
    "needs doing once after each crawl.",
};

export const RECAPTURE_PAGE: Remediation = {
  command: "page_fetch",
  scope: "page",
  label: "Capture this page again",
  explainer:
    "We fetch a fresh copy of this one page right now and measure it. It " +
    "takes a few seconds and changes nothing on your website.",
};

export const COLLECT_PAGESPEED: Remediation = {
  command: "pagespeed_collect",
  scope: "page",
  label: "Measure this page's speed",
  explainer:
    "We load this one page in a real phone-sized browser and time it — how " +
    "fast the main content appears, how long it stays unresponsive, and how " +
    "much the layout jumps. It takes under a minute and changes nothing on " +
    "your website.",
};

export const SYNC_GSC: Remediation = {
  command: "gsc_sync",
  scope: "site",
  label: "Pull this site's Google data",
  explainer:
    "We ask Google Search Console for the clicks, impressions and average " +
    "positions it recorded for this site, and store them so the search " +
    "checks can read real numbers instead of guessing. It reads only; " +
    "nothing on your website or in Google changes.",
};

export const SYNC_SITEMAPS: Remediation = {
  command: "sitemaps_sync",
  scope: "site",
  label: "Read this site's sitemap",
  explainer:
    "We find and read the sitemap files your website publishes — the list " +
    "of pages it asks search engines to index — and compare them with the " +
    "pages we actually found. It takes seconds and changes nothing on your " +
    "website.",
};

export const RECRAWL_SITE: Remediation = {
  command: "site_recrawl",
  scope: "site",
  label: "Crawl this site again",
  explainer:
    "We walk the whole site from the homepage, re-reading every page and " +
    "the links between them. This is the slow one — it can take a while on " +
    "a large site — but it is what rebuilds the site-wide picture.",
};

export interface CheckOutcome {
  status: CheckStatus;
  score: number | null;
  reasoning: string;
  issueCount: number;
  evidence: Record<string, unknown> | null;
  /** Set whenever the verdict is blocked on evidence the platform can go get. */
  remediation: Remediation | null;
}

function outcome(
  status: CheckStatus,
  score: number | null,
  reasoning: string,
  issueCount = 0,
  evidence: Record<string, unknown> | null = null,
  remediation: Remediation | null = null,
): CheckOutcome {
  return { status, score, reasoning, issueCount, evidence, remediation };
}

// ---------------------------------------------------------------------------
// Formatting helpers — Python semantics, not JavaScript's
// ---------------------------------------------------------------------------

export function clampScore(value: number): number {
  return Math.max(1, Math.min(100, value));
}

export function sampleUrls(urls: string[]): string[] {
  return urls.slice(0, CHECK_EVIDENCE_SAMPLE_LIMIT);
}

/**
 * Python `round()` is banker's rounding (half-to-even); `Math.round` is
 * half-up. They disagree on e.g. 46.5, which `checkImageAltPresence` can
 * produce, so the mirror needs Python's rule.
 */
function pythonRound(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

/** Python string slicing counts code points, not UTF-16 units. */
function sliceCodePoints(text: string, end: number): string {
  return Array.from(text).slice(0, end).join("");
}

/** Python `f"{n:,}"` — locale-free thousands separators. */
function withThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Round a double the way Python's `format(value, f".{digits}f")` does:
 * correctly-rounded decimal with HALF-TO-EVEN on an exact tie. `toFixed`
 * rounds ties away from zero, so `(2.25).toFixed(1)` is "2.3" where Python
 * says "2.2" — a divergence a display-width ratio hits for real.
 */
function pyFixed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return String(value);
  const negative = value < 0;
  const expansion = Math.abs(value).toFixed(Math.min(100 - digits, digits + 25));
  const dot = expansion.indexOf(".");
  const intPart = dot === -1 ? expansion : expansion.slice(0, dot);
  const fracPart = dot === -1 ? "" : expansion.slice(dot + 1);
  const keep = fracPart.slice(0, digits).padEnd(digits, "0");
  const rest = fracPart.slice(digits);
  let roundUp = false;
  if (rest) {
    const first = rest[0];
    const tail = rest.slice(1);
    if (first > "5") roundUp = true;
    else if (first === "5") {
      if (/[1-9]/.test(tail)) roundUp = true;
      else {
        const lastKept =
          digits > 0 ? keep[digits - 1] : intPart[intPart.length - 1];
        roundUp = Number(lastKept) % 2 === 1;
      }
    }
  }
  const all = (intPart + keep).split("");
  if (roundUp) {
    let i = all.length - 1;
    for (; i >= 0; i -= 1) {
      if (all[i] === "9") all[i] = "0";
      else {
        all[i] = String(Number(all[i]) + 1);
        break;
      }
    }
    if (i < 0) all.unshift("1");
  }
  const joined = all.join("");
  const head = digits > 0 ? joined.slice(0, joined.length - digits) : joined;
  const tail = digits > 0 ? joined.slice(joined.length - digits) : "";
  const body = (head || "0") + (digits > 0 ? `.${tail}` : "");
  return negative && Number(body) !== 0 ? `-${body}` : body;
}

/** Python `round(value, digits)` — the same half-to-even rule, as a number. */
function pyRoundTo(value: number, digits: number): number {
  return Number(pyFixed(value, digits));
}

/** Python's `urlsplit` — deliberately NOT `new URL()`, which normalizes. */
interface UrlParts {
  scheme: string;
  netloc: string;
  path: string;
  query: string;
  fragment: string;
}

function urlSplit(url: string): UrlParts {
  let rest = url;
  let scheme = "";
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.\-]*):/.exec(rest);
  if (schemeMatch) {
    scheme = schemeMatch[1].toLowerCase();
    rest = rest.slice(schemeMatch[0].length);
  }
  let netloc = "";
  if (rest.startsWith("//")) {
    rest = rest.slice(2);
    const end = rest.search(/[/?#]/);
    netloc = end === -1 ? rest : rest.slice(0, end);
    rest = end === -1 ? "" : rest.slice(end);
  }
  let fragment = "";
  const hash = rest.indexOf("#");
  if (hash !== -1) {
    fragment = rest.slice(hash + 1);
    rest = rest.slice(0, hash);
  }
  let query = "";
  const mark = rest.indexOf("?");
  if (mark !== -1) {
    query = rest.slice(mark + 1);
    rest = rest.slice(0, mark);
  }
  return { scheme, netloc, path: rest, query, fragment };
}

/** Python `str.rstrip(chars)` for the one character these checks strip. */
function rstripSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Python `urlsplit(...).netloc`, minus a leading `www.`. Deliberately NOT
 * `new URL()`: the WHATWG parser strips default ports and re-encodes, so it
 * would disagree with the server on `https://host:443/x`.
 */
export function registrableHost(url: string): string {
  const host = urlSplit(url).netloc.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

function chainUrls(ev: PageEvidence): string[] {
  return (ev.redirectChain ?? [])
    .filter((hop): hop is RedirectHop => Boolean(hop && hop.url))
    .map((hop) => String(hop.url));
}

// --- URL design ------------------------------------------------------------

export function checkUrlDesignQuality(ev: PageEvidence): CheckOutcome {
  const parts = urlSplit(ev.url);
  const params = Array.from(new URLSearchParams(parts.query).entries());
  const designedPart = parts.query ? `${parts.path}?${parts.query}` : parts.path;
  const normalizedParamNames = new Set(
    params.map(([name]) => name.toLowerCase().replace(/[^a-z0-9]/g, "")),
  );
  const problems: string[] = [];
  let penalty = 0;
  const urlLength = Array.from(ev.url).length;
  const hasUppercase = Array.from(designedPart).some(
    (character) =>
      character.toUpperCase() === character &&
      character.toLowerCase() !== character,
  );
  const hasUnderscores = designedPart.includes("_");
  const hasNonAscii = Array.from(ev.url).some(
    (character) => (character.codePointAt(0) ?? 0) > 127,
  );
  const sessionParams = Array.from(normalizedParamNames)
    .filter((name) => URL_DESIGN_SESSION_PARAM_NAMES.has(name))
    .sort();

  if (urlLength > URL_DESIGN_MAX_LENGTH) {
    penalty += URL_DESIGN_LONG_PENALTY;
    problems.push(`longer than ${URL_DESIGN_MAX_LENGTH} characters`);
  }
  if (params.length > URL_DESIGN_MAX_PARAMS) {
    penalty += URL_DESIGN_MANY_PARAMS_PENALTY;
    problems.push(`has ${params.length} query parameters`);
  }
  if (hasUppercase) {
    penalty += URL_DESIGN_UPPERCASE_PENALTY;
    problems.push("contains uppercase letters");
  }
  if (hasUnderscores) {
    penalty += URL_DESIGN_UNDERSCORE_PENALTY;
    problems.push("contains underscores");
  }
  if (hasNonAscii) {
    penalty += URL_DESIGN_NON_ASCII_PENALTY;
    problems.push("contains non-ASCII characters");
  }
  if (sessionParams.length > 0) {
    penalty += URL_DESIGN_SESSION_PARAM_PENALTY;
    problems.push(
      `contains a session identifier (${sessionParams.join(", ")})`,
    );
  }

  const score = Math.max(1, 100 - penalty);
  const evidence: Record<string, unknown> = {
    url_length: urlLength,
    parameter_count: params.length,
    has_uppercase: hasUppercase,
    has_underscores: hasUnderscores,
    has_non_ascii: hasNonAscii,
    session_params: sessionParams,
  };
  if (problems.length === 0) {
    return outcome(
      "pass",
      100,
      "This URL is short, readable, and free of tracking-state clutter.",
      0,
      evidence,
    );
  }
  const lengthOnly = penalty === URL_DESIGN_LONG_PENALTY && problems.length === 1;
  if (lengthOnly) {
    // A long slug is not a defect worth a person's time (changing a live URL
    // means redirects and risk). It lowers the score the catalog formula
    // gives it, but never opens a finding.
    return outcome(
      "pass",
      score,
      `This URL is longer than ${URL_DESIGN_MAX_LENGTH} characters, but nothing else ` +
        "about it is a problem; a long slug alone is not worth changing.",
      0,
      evidence,
    );
  }
  const sentence = problems
    .map((problem) =>
      problem.startsWith("has ") || problem.startsWith("contains ")
        ? problem
        : `is ${problem}`,
    )
    .join("; ");
  return outcome(
    "warn",
    score,
    `This URL ${sentence} — simpler, stable URLs are easier for people ` +
      "and search engines to understand.",
    problems.length,
    evidence,
  );
}

// --- Title -----------------------------------------------------------------

/**
 * A URL we attempted but never parsed (a 404, a 5xx, a loop) has no <head>.
 * Reporting its title, description or canonical as MISSING would invent
 * findings about markup nobody read — the transport checks own that URL.
 */
function headNotCaptured(): CheckOutcome {
  return outcome(
    "n_a",
    null,
    "We never received this page's HTML (the server answered with an error or " +
      "never answered), so there is no <head> to judge.",
  );
}

export function checkTitlePresence(ev: PageEvidence): CheckOutcome {
  if (!ev.headCaptured) return headNotCaptured();
  if (ev.title) {
    return outcome(
      "pass",
      100,
      `Title present: "${sliceCodePoints(ev.title, 120)}".`,
    );
  }
  return outcome(
    "fail",
    15,
    "This page has no <title> tag (or it is empty) — search engines will " +
      "synthesize one, and the SERP headline is out of your control.",
    1,
  );
}

/**
 * Character bands from the catalogue's own `score_contract` for
 * `title_length` (optimal 30-60; 61-70 and 15-29 borderline; over 70
 * truncates; under 15 too short).
 */
export const TITLE_BAND_OPTIMAL: readonly [number, number] = [30, 60];
export const TITLE_BAND_BORDERLINE_MAX = 70;
export const TITLE_BAND_TOO_SHORT = 15;
/** `meta_description_length` contract: optimal 70-155, over 165 truncates, under 50 thin. */
export const DESCRIPTION_BAND_OPTIMAL: readonly [number, number] = [70, 155];
export const DESCRIPTION_BAND_TRUNCATES = 165;
export const DESCRIPTION_BAND_TOO_SHORT = 50;

/** Python `len(" ".join(text.split()))` — whitespace-collapsed code points. */
function collapsedLength(text: string): number {
  const words = text.split(/\s+/).filter((word) => word !== "");
  return Array.from(words.join(" ")).length;
}

/** Pixel width of THIS text, measured now — never a stored flag from an older capture. */
function pixelNote(text: string, kind: "title" | "description"): string {
  const evaluation =
    kind === "title" ? evaluateMetaTitle(text) : evaluateMetaDescription(text);
  return `, about ${evaluation.pixelWidth}px wide`;
}

/**
 * Scored by the contract's character bands, from the title text itself.
 * Pixel width is shown as a measurement of THIS title, never as a verdict.
 */
export function checkTitleLength(ev: PageEvidence): CheckOutcome {
  if (!ev.title) {
    return outcome(
      "n_a",
      null,
      "This page has no title yet, so there is nothing to measure.",
    );
  }
  const chars = collapsedLength(ev.title);
  const detail = `${chars} chars${pixelNote(ev.title, "title")}`;
  const [low, high] = TITLE_BAND_OPTIMAL;
  if (chars > TITLE_BAND_BORDERLINE_MAX) {
    return outcome(
      "warn",
      55,
      `The title is ${detail} — over ${TITLE_BAND_BORDERLINE_MAX} characters Google ` +
        `almost always cuts it off in results. Aim for ${low}-${high}.`,
      1,
    );
  }
  if (chars < TITLE_BAND_TOO_SHORT) {
    return outcome(
      "warn",
      50,
      `The title is only ${detail} — too short to say what the page is about. ` +
        `Aim for ${low}-${high}.`,
      1,
    );
  }
  if (low <= chars && chars <= high) {
    return outcome("pass", 100, `Title length is in the optimal window (${detail}).`);
  }
  return outcome(
    "pass",
    75,
    `Title is ${detail} — a little outside the ${low}-${high} sweet spot, but ` +
      "not enough to matter.",
    1,
  );
}

// --- Meta description ------------------------------------------------------

export function checkMetaDescriptionPresence(ev: PageEvidence): CheckOutcome {
  if (!ev.headCaptured) return headNotCaptured();
  if (ev.description) {
    return outcome("pass", 100, "Meta description present.");
  }
  return outcome(
    "fail",
    45,
    "No meta description — Google will scrape arbitrary body text for the " +
      "snippet, and CTR suffers.",
    1,
  );
}

/** Scored by the contract's character bands, from the description text itself. */
export function checkMetaDescriptionLength(ev: PageEvidence): CheckOutcome {
  if (!ev.description) {
    return outcome(
      "n_a",
      null,
      "This page has no meta description yet, so there is nothing to measure.",
    );
  }
  const chars = collapsedLength(ev.description);
  const detail = `${chars} chars${pixelNote(ev.description, "description")}`;
  const [low, high] = DESCRIPTION_BAND_OPTIMAL;
  if (chars > DESCRIPTION_BAND_TRUNCATES) {
    return outcome(
      "warn",
      65,
      `The meta description is ${detail} — over ${DESCRIPTION_BAND_TRUNCATES} ` +
        `characters Google cuts it off. Aim for ${low}-${high}.`,
      1,
    );
  }
  if (chars < DESCRIPTION_BAND_TOO_SHORT) {
    return outcome(
      "warn",
      60,
      `The meta description is only ${detail} — too short to earn the click. ` +
        `Aim for ${low}-${high}.`,
      1,
    );
  }
  if (low <= chars && chars <= high) {
    return outcome(
      "pass",
      100,
      `Meta description length is in the optimal window (${detail}).`,
    );
  }
  return outcome(
    "pass",
    80,
    `Meta description is ${detail} — slightly outside the ${low}-${high} window, ` +
      "which is not a problem.",
    1,
  );
}

// --- Structure -------------------------------------------------------------

export function checkH1Presence(ev: PageEvidence): CheckOutcome {
  const h1Count = ev.h1Count;
  if (h1Count === null || h1Count === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded this page's headings yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (h1Count === 1) return outcome("pass", 100, "Exactly one H1.");
  if (h1Count === 0) {
    return outcome(
      "fail",
      30,
      "No H1 on the page — the primary on-page topic signal is missing.",
      1,
    );
  }
  return outcome(
    "warn",
    55,
    `${h1Count} H1 tags — search engines accept several, but one clear H1 keeps ` +
      "the page's topic unambiguous.",
    h1Count - 1,
  );
}

/**
 * URL path segments of pages that exist to DO something (contact, say thanks,
 * take an application) rather than to be read. Length is not their job, so
 * the content-volume checks exempt them (`[\p{L}\p{N}_]` is Python's Unicode `\w`).
 */
export const UTILITY_PATH_PATTERN =
  /(?:^|\/)(?:contact(?:-us)?|thank-?you[\p{L}\p{N}_-]*|thanks|confirmation|confirmed|application[\p{L}\p{N}_-]*|apply[\p{L}\p{N}_-]*|job-application[\p{L}\p{N}_-]*|[\p{L}\p{N}_-]*-form|forms?|login|log-in|signin|sign-in|register|signup|sign-up|cart|checkout|account|unsubscribe|search|privacy[\p{L}\p{N}_-]*|terms[\p{L}\p{N}_-]*)(?:\/|$)/iu;

/** Path segments that mark a page as an article/post by where it lives. */
export const ARTICLE_PATH_PATTERN =
  /(?:^|\/)(?:blog|news|articles?|posts?|insights|stories|resources|guides?|learn|press|magazine)(?:\/|$)|\/20\d\d\/\d\d?\//iu;

function isUtilityUrl(url: string): boolean {
  return UTILITY_PATH_PATTERN.test(urlSplit(url).path || "/");
}

/** A page that asks not to be indexed is not held to a ranking-content bar. */
function noindexNotApplicable(ev: PageEvidence, what: string): CheckOutcome | null {
  if (ev.noindex) {
    return outcome(
      "n_a",
      null,
      `This page is noindexed, so ${what} does not apply to it — it is not ` +
        "meant to rank.",
    );
  }
  return null;
}

export function checkThinContent(ev: PageEvidence): CheckOutcome {
  const words = ev.wordCount;
  if (words === null || words === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't counted the words on this page yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const skip = noindexNotApplicable(ev, "word count");
  if (skip) return skip;
  if (isUtilityUrl(ev.url)) {
    return outcome(
      "n_a",
      null,
      "This is a utility page (contact, thank-you, form, login), where length is not " +
        "what makes it good.",
    );
  }
  if (words >= CONTENT_OK_WORDS) {
    return outcome("pass", 100, `${words} words of visible text.`);
  }
  if (words >= CONTENT_WARN_WORDS) {
    return outcome(
      "warn",
      70,
      `Only ${words} words of visible text (below ${CONTENT_OK_WORDS}) — ` +
        "thin pages struggle to rank for anything competitive.",
      1,
    );
  }
  if (words >= CONTENT_FAIL_WORDS) {
    return outcome(
      "warn",
      45,
      `Only ${words} words of visible text — this is thin content by any ` +
        `industry bar (Screaming Frog flags under ${CONTENT_WARN_WORDS}).`,
      1,
    );
  }
  return outcome(
    "fail",
    20,
    `Only ${words} words of visible text — effectively an empty page to a search engine.`,
    1,
  );
}

// --- Indexability ----------------------------------------------------------

export function checkMetaRobotsConflicts(ev: PageEvidence): CheckOutcome {
  const robots = (ev.metaRobots ?? "").toLowerCase();
  const tokens = new Set(
    robots
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean),
  );
  if ((ev.noindex === null || ev.noindex === undefined) && !robots) {
    return outcome("pass", 100, "No robots directives — indexable by default.");
  }
  if (tokens.has("index") && tokens.has("noindex")) {
    return outcome(
      "fail",
      25,
      `Conflicting robots directives ("${ev.metaRobots}") — index and ` +
        "noindex together leave the outcome to the crawler's mood.",
      1,
    );
  }
  if (ev.noindex) {
    return outcome(
      "fail",
      10,
      "Page is noindexed — it can never rank. If that is intentional, " +
        "suppress this finding; if not, this silently removes the page from Google.",
      1,
      { meta_robots: ev.metaRobots ?? null },
    );
  }
  if (ev.nofollow) {
    return outcome(
      "warn",
      45,
      "Page is nofollowed — its internal links pass no signals onward.",
      1,
      { meta_robots: ev.metaRobots ?? null },
    );
  }
  return outcome(
    "pass",
    100,
    robots
      ? `Robots directives are clean ("${ev.metaRobots}").`
      : "Robots directives are clean.",
  );
}

export function checkCanonicalPresence(ev: PageEvidence): CheckOutcome {
  if (!ev.headCaptured) return headNotCaptured();
  const canonical = ev.canonicalUrl;
  if (!canonical) {
    if (ev.noindex) {
      return outcome(
        "n_a",
        null,
        "This page is noindexed, so a missing canonical does not matter — it " +
          "is not competing in the index.",
      );
    }
    return outcome(
      "warn",
      65,
      "No rel=canonical — parameter/scheme/host variants of this URL can " +
        "compete with it in the index.",
      1,
    );
  }
  if (!canonical.startsWith("http://") && !canonical.startsWith("https://")) {
    return outcome(
      "warn",
      45,
      `rel=canonical is not an absolute URL ("${sliceCodePoints(canonical, 120)}") — ` +
        "relative canonicals are error-prone and best made absolute.",
      1,
    );
  }
  return outcome(
    "pass",
    100,
    `rel=canonical present: ${sliceCodePoints(canonical, 160)}`,
  );
}

export function checkCanonicalConflicts(ev: PageEvidence): CheckOutcome {
  const canonical = ev.canonicalUrl;
  if (
    !canonical ||
    (!canonical.startsWith("http://") && !canonical.startsWith("https://"))
  ) {
    return outcome(
      "n_a",
      null,
      "This page has no full canonical link, so there is nothing to check.",
    );
  }
  if (ev.canonicalMatches === true) {
    return outcome("pass", 100, "Canonical is self-referential — no conflict.");
  }
  if (ev.canonicalMatches === null || ev.canonicalMatches === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't checked where this page's canonical link points yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (registrableHost(canonical) !== registrableHost(ev.url)) {
    return outcome(
      "fail",
      25,
      `Canonical points at a DIFFERENT site (${sliceCodePoints(canonical, 160)}) — this page ` +
        "donates all its equity off-domain. Verify that is deliberate.",
      1,
      { canonical_url: canonical },
    );
  }
  if (ev.noindex) {
    return outcome(
      "fail",
      20,
      "Page is noindexed AND canonicalized to another URL — two conflicting " +
        "de-indexing signals; Google ignores canonicals on noindexed pages.",
      1,
      { canonical_url: canonical },
    );
  }
  return outcome(
    "warn",
    55,
    `Page is canonicalized to another URL (${sliceCodePoints(canonical, 160)}) — fine when ` +
      "this is a deliberate duplicate, a leak when it is not.",
    1,
    { canonical_url: canonical },
  );
}

// --- Transport -------------------------------------------------------------
//
// Status and redirects are split into FOUR checks, not two, because the
// `web.analysis_item` catalog models them as four separate items
// (`broken_page_4xx`, `server_error_5xx`, `redirect_chain`, `redirect_loop`)
// with different weights and severity bands — a 5xx is a 3.0-weight outage, a
// 4xx is a dead end, and a loop is categorically worse than a long chain. One
// combined check could only ever be recorded under one of those keys, so the
// other verdicts would be computed and thrown away.

const BLOCKED_FETCH_WORDS: Record<string, string> = {
  cloudflare_block:
    "a bot-protection challenge (Cloudflare or similar) stopped our crawler",
  blocked: "the server refused our crawler (HTTP 401/403)",
  RateLimited: "the server kept answering 'too many requests' until we gave up",
  RateLimitTimeout: "the crawl stopped on rate limits before this page was fetched",
};

/**
 * Statuses that ARE a wall whatever reason code the crawl stored: the server
 * answered, but about us, not about the page.
 */
const WALL_STATUS_REASONS: Record<number, string> = {
  401: "blocked",
  403: "blocked",
  429: "RateLimited",
};

/** n_a, naming the wall, when we were kept out instead of seeing a failure. */
function blockedFetchOutcome(ev: PageEvidence): CheckOutcome | null {
  const reason =
    ev.fetchBlockedReason || WALL_STATUS_REASONS[ev.httpStatus ?? -1];
  if (!reason) return null;
  const words =
    BLOCKED_FETCH_WORDS[reason] ?? `our crawler was blocked (${reason})`;
  return outcome(
    "n_a",
    null,
    `Blocked — could not assess: ${words}. A page that shuts out a crawler is ` +
      "not a broken page; it may load fine for people. Check it in a browser, or " +
      "allow our crawler and crawl again.",
    0,
    { blocked_reason: reason, http_status: ev.httpStatus ?? null },
  );
}

export function checkBrokenPage4xx(ev: PageEvidence): CheckOutcome {
  const blocked = blockedFetchOutcome(ev);
  if (blocked !== null) return blocked;
  const status = ev.httpStatus;
  if (status === null || status === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded what this page's server answered yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (status >= 400 && status < 500) {
    return outcome(
      "fail",
      10,
      `The page returns HTTP ${status} — it is a dead end; every link ` +
        "pointing here is wasted.",
      1,
      { http_status: status },
    );
  }
  return outcome("pass", 100, `HTTP ${status} — not a client error.`);
}

export function checkServerError5xx(ev: PageEvidence): CheckOutcome {
  const blocked = blockedFetchOutcome(ev);
  if (blocked !== null) return blocked;
  const status = ev.httpStatus;
  if (status === null || status === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded what this page's server answered yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  // 0 is the crawler's "no response at all" (timeout / connection refused),
  // which the catalog item scores together with 5xx.
  if (status === 0) {
    return outcome(
      "fail",
      5,
      "The server never responded (timeout or connection failure) — the page " +
        "is unreachable for users and crawlers alike.",
      1,
      { http_status: status },
    );
  }
  if (status >= 500 && status < 600) {
    return outcome(
      "fail",
      5,
      `The server returned HTTP ${status} — the page is broken for users and ` +
        "will be dropped from the index if it persists.",
      1,
      { http_status: status },
    );
  }
  return outcome("pass", 100, `HTTP ${status} — not a server error.`);
}

function chainLoops(ev: PageEvidence): boolean {
  const urls = chainUrls(ev);
  return urls.length !== new Set(urls).size;
}

/** redirect_chain contract ladder: 1 hop 85, 2 hops 60, 3 hops 40, 4+ hops 20. */
const REDIRECT_HOP_SCORES: Record<number, number> = { 1: 85, 2: 60, 3: 40 };

export function checkRedirectChain(ev: PageEvidence): CheckOutcome {
  const chain = ev.redirectChain ?? [];
  const status = ev.httpStatus;
  if (chainLoops(ev)) {
    // One defect, one verdict: a loop is `redirect_loop`'s finding.
    return outcome("n_a", null, "This redirect loops — see the redirect loop check.");
  }
  if (status !== null && status !== undefined && status >= 300 && status < 400) {
    return outcome(
      "warn",
      60,
      `The URL answers with HTTP ${status} rather than serving content ` +
        "directly — link to the destination instead.",
      1,
      { http_status: status },
    );
  }
  const hops = Math.max(0, chain.length - 1);
  if (hops === 0) {
    return outcome(
      "pass",
      100,
      "No redirects — the URL serves content directly.",
    );
  }
  const score = REDIRECT_HOP_SCORES[hops] ?? 20;
  if (hops === 1) {
    return outcome("pass", score, "One clean redirect before this page resolves.");
  }
  return outcome(
    score >= 50 ? "warn" : "fail",
    score,
    `${hops} redirect hops before this page resolves — every hop wastes ` +
      "crawl budget and leaks link equity.",
    hops,
    { redirect_chain: sampleUrls(chainUrls(ev)) },
  );
}

export function checkRedirectLoop(ev: PageEvidence): CheckOutcome {
  const urlsInChain = chainUrls(ev);
  if (urlsInChain.length === 0) {
    return outcome("pass", 100, "No redirect chain to loop.");
  }
  if (new Set(urlsInChain).size !== urlsInChain.length) {
    return outcome(
      "fail",
      1,
      "The redirect chain visits the same URL twice — a redirect LOOP; " +
        "neither users nor crawlers ever arrive.",
      1,
      { redirect_chain: sampleUrls(urlsInChain) },
    );
  }
  return outcome(
    "pass",
    100,
    "Every hop in the redirect chain is a distinct URL.",
  );
}

/**
 * `rel=next`/`rel=prev` sanity. Google stopped using these as an indexing
 * signal in 2019, but they remain a discovery hint for crawlers and a
 * correctness signal for the site: a page that points `rel=next`/`rel=prev`
 * at ITSELF is a paginator bug that traps a crawler on one page of the series.
 */
export function checkPaginationMarkup(ev: PageEvidence): CheckOutcome {
  const pagination = ev.pagination ?? {};
  if (Object.keys(pagination).length === 0) {
    return outcome(
      "n_a",
      null,
      "This page is not part of a next/previous page series, so there is " +
        "nothing to check.",
    );
  }
  const rstripSlash = (value: string): string => value.replace(/\/+$/, "");
  const selfRefs = (["prev", "next"] as const).filter(
    (rel) =>
      Boolean(pagination[rel]) &&
      rstripSlash(String(pagination[rel])) === rstripSlash(ev.url),
  );
  if (selfRefs.length > 0) {
    return outcome(
      "fail",
      25,
      `rel=${selfRefs.join("/")} points at this page itself — the pagination ` +
        "series is a dead end; crawlers cannot reach the rest of it.",
      selfRefs.length,
      { pagination: { ...pagination } },
    );
  }
  const declared = (["prev", "next"] as const)
    .filter((rel) => Boolean(pagination[rel]))
    .map((rel) => `rel=${rel}`)
    .join(", ");
  return outcome(
    "pass",
    100,
    `Pagination markup is coherent (${declared}).`,
    0,
    { pagination: { ...pagination } },
  );
}

const ACTIVE_MIXED_EXTENSIONS = [".js", ".mjs", ".css", ".html", ".htm", ".php", ".json"];
const PASSIVE_MIXED_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico", ".bmp",
  ".mp4", ".webm", ".ogg", ".mp3", ".wav", ".m4a", ".woff", ".woff2", ".ttf",
];

/** Images and media are passive; script/stylesheet/iframe (and anything unknown) are active. */
function isPassiveMixed(url: string): boolean {
  const path = urlSplit(url).path.toLowerCase();
  return (
    PASSIVE_MIXED_EXTENSIONS.some((ext) => path.endsWith(ext)) &&
    !ACTIVE_MIXED_EXTENSIONS.some((ext) => path.endsWith(ext))
  );
}

export function checkMixedContent(ev: PageEvidence): CheckOutcome {
  const resources = ev.mixedContent ?? [];
  if (resources.length === 0) {
    return outcome(
      "pass",
      100,
      "No insecure http:// resources on this page.",
    );
  }
  const n = resources.length;
  // mixed_content contract: any active resource 20, passive only 50. A URL we
  // cannot classify counts as active - the safer reading.
  const active = resources.filter((url) => !isPassiveMixed(url));
  const score = active.length ? 20 : 50;
  const kind = active.length
    ? `${active.length} of them are scripts, stylesheets or frames that browsers block`
    : "all are images or media that browsers warn about";
  return outcome(
    active.length ? "fail" : "warn",
    score,
    `${n} resource(s) load over plain http:// on an https:// page — ${kind}, ` +
      "and the padlock disappears.",
    n,
    { mixed_content: sampleUrls(resources) },
  );
}

/**
 * HTML DOCUMENT weight — not total page weight.
 *
 * The crawl downloads the document and reads every subresource URL out of the
 * markup, but it never fetches those subresources, so their transfer sizes do
 * not exist anywhere in the evidence. This check therefore grades the one
 * number that IS measured, and the catalog row states the same scope. The
 * day subresource sizes are captured, both move together.
 */
export function checkPageWeight(ev: PageEvidence): CheckOutcome {
  const size = ev.responseBytes;
  if (size === null || size === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded how big this page is yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (size <= LARGE_PAGE_BYTES) {
    return outcome(
      "pass",
      100,
      `HTML document is ${withThousands(size)} bytes.`,
    );
  }
  return outcome(
    "warn",
    40,
    `The HTML document alone is ${withThousands(size)} bytes (over ${withThousands(LARGE_PAGE_BYTES)}) — ` +
      "slow on mobile connections and expensive to crawl.",
    1,
    { bytes: size },
  );
}

/**
 * True time to first byte, graded on the row's 800 / 1800 ms bands.
 *
 * Reads `ttfbMs` ONLY. `responseTimeMs` is total elapsed — it also covers the
 * body download, so a big page on a fast server looks slow through it. A
 * snapshot captured before TTFB was measured (or by the browser transport,
 * which cannot report it) has no `ttfbMs` and answers n_a: an unknown server
 * speed is never scored, in either direction.
 */
export function checkTtfbServerResponse(ev: PageEvidence): CheckOutcome {
  const ttfb = ev.ttfbMs;
  if (ttfb === null || ttfb === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't measured this page's server response time yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  let measured = "";
  if (ev.ttfbMeasuredAt) {
    const at = Date.parse(ev.ttfbMeasuredAt);
    if (!Number.isNaN(at)) {
      const day = ev.ttfbMeasuredAt.slice(0, 10);
      const ageDays = Math.floor((Date.now() - at) / 86_400_000);
      if (ageDays > TTFB_MAX_AGE_DAYS) {
        return outcome(
          "n_a",
          null,
          "The last server response time for this page was measured " +
            `${ageDays} days ago (${day}) — ` +
            "too old to describe the server as it is today.",
          0,
          null,
          RECAPTURE_PAGE,
        );
      }
      measured = ` (measured ${day})`;
    }
  }
  // Floor division, not rounding, in all three bands: Python rounds halves to
  // even and JavaScript rounds them up, so a rounded score would diverge from
  // the Python original on exact midpoints. Floor over non-negative integers
  // means the same thing in both languages.
  if (ttfb <= TTFB_GOOD_MS) {
    // 100 at instant, easing to 90 at the good/needs-work boundary.
    return outcome(
      "pass",
      clampScore(100 - Math.floor((10 * ttfb) / TTFB_GOOD_MS)),
      `The server sent the first byte in ${ttfb} ms${measured} — comfortably inside ` +
        `the ${TTFB_GOOD_MS} ms bar for a good server response.`,
      0,
      { ttfb_ms: ttfb },
    );
  }
  if (ttfb <= TTFB_POOR_MS) {
    // 89 down to 50 across the needs-improvement band.
    const span = TTFB_POOR_MS - TTFB_GOOD_MS;
    return outcome(
      "warn",
      clampScore(89 - Math.floor((39 * (ttfb - TTFB_GOOD_MS)) / span)),
      `The server took ${ttfb} ms${measured} to send the first byte (over ` +
        `${TTFB_GOOD_MS} ms) — every other speed metric starts late, and ` +
        "visitors feel the delay before anything appears.",
      1,
      { ttfb_ms: ttfb },
    );
  }
  return outcome(
    "fail",
    clampScore(49 - Math.floor((ttfb - TTFB_POOR_MS) / 100)),
    `The server took ${ttfb} ms${measured} to send the first byte (over ` +
      `${TTFB_POOR_MS} ms) — slow server response suppresses both rankings ` +
      "and conversions.",
    1,
    { ttfb_ms: ttfb },
  );
}

// --- Outline and depth -----------------------------------------------------

/**
 * The document outline: skipped levels and empty headings.
 *
 * A "skip" is a jump of more than one level between two CONSECUTIVE headings
 * (h2 → h4). The first heading is never a skip — a page whose outline starts
 * at h2 has a missing H1, which is checkH1Presence's verdict, not this one's;
 * counting it twice would double-charge the same defect.
 */
export function checkHeadingHierarchy(ev: PageEvidence): CheckOutcome {
  const headings = ev.headings;
  if (headings === null || headings === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded this page's headings yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }

  const levels: number[] = [];
  let empty = 0;
  for (const item of headings) {
    const level = item?.level;
    if (typeof level !== "number" || !Number.isInteger(level)) continue;
    if (level < 1 || level > 6) continue;
    levels.push(level);
    const text = item?.text;
    if (typeof text !== "string" || !text.trim()) empty += 1;
  }

  if (levels.length === 0) {
    const words = ev.wordCount;
    if (words === null || words === undefined) {
      return outcome(
        "n_a",
        null,
        "This page has no headings, and we haven't counted its words yet — " +
          "we can't tell whether that's a problem.",
        0,
        null,
        RECAPTURE_PAGE,
      );
    }
    if (words > CONTENT_OK_WORDS) {
      return outcome(
        "warn",
        55,
        `${words} words of text and not a single heading — readers and search ` +
          "engines both navigate by headings, and this page gives them none.",
        1,
      );
    }
    return outcome(
      "pass",
      100,
      "No headings, but too little content on the page to need them.",
    );
  }

  const skips: [number, number][] = [];
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] > levels[i - 1] + 1) skips.push([levels[i - 1], levels[i]]);
  }
  const emptyRatio = empty / levels.length;
  const detail = skips.length
    ? `${skips.length} skipped heading level(s)`
    : `${empty} heading(s) with no text`;
  const evidence = {
    heading_levels: levels.slice(0, CHECK_EVIDENCE_SAMPLE_LIMIT),
    skipped_levels: skips
      .map(([a, b]) => `h${a}->h${b}`)
      .slice(0, CHECK_EVIDENCE_SAMPLE_LIMIT),
    empty_headings: empty,
    heading_count: levels.length,
  };
  if (
    skips.length > HEADING_SKIP_FAIL_COUNT ||
    emptyRatio > HEADING_EMPTY_FAIL_RATIO
  ) {
    // The row's severity_map puts a 45 in the "low" band — a real defect to
    // fix, not a page-breaking one, so it warns rather than fails.
    return outcome(
      "warn",
      45,
      `The heading outline is broken (${detail} across ${levels.length} headings) — ` +
        "the page reads as a pile of styled text rather than a structured document.",
      skips.length + empty,
      evidence,
    );
  }
  if (skips.length || empty) {
    return outcome(
      "warn",
      70,
      `The heading outline has gaps (${detail}) — headings should step down one ` +
        "level at a time and always carry text.",
      skips.length + empty,
      evidence,
    );
  }
  return outcome(
    "pass",
    100,
    `Clean heading outline across ${levels.length} headings.`,
  );
}

/**
 * The page's own claim about what kind of page it is — schema.org `@type`
 * first, then `og:type`. Returns null when the page declares nothing we
 * recognize (a genuine "we don't know", not a default).
 */
export function declaredPageType(ev: PageEvidence): string | null {
  const declared: string[] = [];
  if (ev.schemaTypes !== null && ev.schemaTypes !== undefined) {
    for (const type of ev.schemaTypes) {
      if (typeof type === "string") declared.push(type.toLowerCase().trim());
    }
  }
  if (ev.og !== null && ev.og !== undefined) {
    const ogType = ev.og["og:type"];
    if (typeof ogType === "string" && ogType.trim()) {
      declared.push(ogType.toLowerCase().trim());
    }
  }
  if (declared.some((t) => CONTENT_DEPTH_ARTICLE_SCHEMA_TYPES.has(t)))
    return "article";
  if (declared.some((t) => CONTENT_DEPTH_COMMERCE_SCHEMA_TYPES.has(t)))
    return "commerce";
  if (declared.some((t) => CONTENT_DEPTH_UTILITY_SCHEMA_TYPES.has(t)))
    return "utility";
  return null;
}

/**
 * An article by what the page IS, not by a label a theme stamps on every page
 * (WordPress emits `og:type=article` on contact forms). A real article is not
 * a utility page AND declares an Article schema.org type or lives in a
 * blog/news style section.
 */
function isRealArticle(ev: PageEvidence): boolean {
  if (isUtilityUrl(ev.url)) return false;
  const schema = (ev.schemaTypes ?? [])
    .filter((type): type is string => typeof type === "string")
    .map((type) => type.toLowerCase().trim());
  if (schema.some((type) => CONTENT_DEPTH_ARTICLE_SCHEMA_TYPES.has(type))) return true;
  return ARTICLE_PATH_PATTERN.test(urlSplit(ev.url).path || "/");
}

/**
 * Content volume measured against the page's OWN declared type.
 *
 * Deliberately NOT a second thin-content verdict: checkThinContent asks an
 * absolute question with a fixed floor, this asks a relative one. When the
 * page declares no type there is no expectation to measure against, so this
 * answers `n_a` rather than restating the floor.
 */
export function checkContentDepth(ev: PageEvidence): CheckOutcome {
  const words = ev.wordCount;
  if (words === null || words === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't counted the words on this page yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (
    (ev.schemaTypes === null || ev.schemaTypes === undefined) &&
    (ev.og === null || ev.og === undefined)
  ) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded what kind of page this is, so there's no " +
        "expectation to measure its length against.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const skip = noindexNotApplicable(ev, "content depth");
  if (skip) return skip;
  const pageType = declaredPageType(ev);
  if (pageType === "article" && !isRealArticle(ev)) {
    return outcome(
      "n_a",
      null,
      "This page only carries an article label (a theme default such as og:type " +
        "article), and it is a utility page or not in a blog/news section — it is " +
        "not judged as an article.",
    );
  }
  if (pageType === null) {
    return outcome(
      "n_a",
      null,
      "This page doesn't say what kind of page it is (no schema.org type, no " +
        "og:type), so there is no per-type length expectation to hold it to. " +
        "Its raw length is covered by the thin-content check.",
    );
  }
  const evidence = { page_type: pageType, word_count: words };
  if (pageType === "utility") {
    return outcome(
      "pass",
      100,
      `This is a ${pageType} page — length is not what makes it good.`,
      0,
      evidence,
    );
  }
  if (pageType === "article") {
    if (words < CONTENT_DEPTH_ARTICLE_MIN_WORDS) {
      return outcome(
        "warn",
        55,
        `This page presents itself as an article but runs only ${words} words ` +
          `(articles that compete usually clear ${CONTENT_DEPTH_ARTICLE_MIN_WORDS}).`,
        1,
        evidence,
      );
    }
    if (words < CONTENT_DEPTH_ARTICLE_TARGET_WORDS) {
      // A PASS carrying an 80: worth knowing on a competitive topic, not a
      // defect — the row's severity_map calls this band "info".
      return outcome(
        "pass",
        80,
        `${words} words — a solid article, still short of the ` +
          `${CONTENT_DEPTH_ARTICLE_TARGET_WORDS} words the best-performing pages ` +
          "on a competitive topic tend to carry.",
        1,
        evidence,
      );
    }
    return outcome(
      "pass",
      100,
      `${words} words — full depth for an article.`,
      0,
      evidence,
    );
  }
  if (words < CONTENT_DEPTH_COMMERCE_MIN_WORDS) {
    return outcome(
      "warn",
      60,
      `Only ${words} words of unique copy on a product/listing page — there is ` +
        "nothing here for a search engine to match a buyer's question against.",
      1,
      evidence,
    );
  }
  return outcome(
    "pass",
    100,
    `${words} words — enough unique copy for a product/listing page.`,
    0,
    evidence,
  );
}

/** Visible-text bytes as a share of the HTML the server sent. */
export function checkTextHtmlRatio(ev: PageEvidence): CheckOutcome {
  const textBytes = ev.textBytes;
  const htmlBytes = ev.responseBytes;
  if (textBytes === null || textBytes === undefined || !htmlBytes) {
    return outcome(
      "n_a",
      null,
      "We haven't measured this page's text against its page size yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const skip = noindexNotApplicable(ev, "the text-to-markup ratio");
  if (skip) return skip;
  if (
    ev.wordCount !== null &&
    ev.wordCount !== undefined &&
    ev.wordCount < CONTENT_OK_WORDS
  ) {
    return outcome(
      "n_a",
      null,
      `This page has only ${ev.wordCount} words, which the thin-content check ` +
        "already reports — a low text share is the same fact, not a second defect.",
    );
  }
  const ratio = textBytes / htmlBytes;
  const evidence = {
    text_bytes: textBytes,
    html_bytes: htmlBytes,
    ratio: pyRoundTo(ratio, 4),
  };
  const percent = `${pyFixed(ratio * 100, 1)}%`;
  if (ratio < TEXT_HTML_RATIO_FAIL) {
    return outcome(
      "warn",
      50,
      `Only ${percent} of this page is readable text (${withThousands(textBytes)} of ` +
        `${withThousands(htmlBytes)} bytes) — either the markup is enormously bloated or the ` +
        "real content only appears after JavaScript runs.",
      1,
      evidence,
    );
  }
  if (ratio <= TEXT_HTML_RATIO_WARN) {
    // contract: 3-10% inclusive. A PASS carrying a 75 — the row's own logic is "advisory signal; only
    // extreme values matter", and its severity_map calls this band "info".
    return outcome(
      "pass",
      75,
      `${percent} of the page is readable text — low, though not unusual for a ` +
        "component-heavy template.",
      1,
      evidence,
    );
  }
  return outcome(
    "pass",
    100,
    `${percent} of the page is readable text.`,
    0,
    evidence,
  );
}

// --- Images & media --------------------------------------------------------
//
// All five read the per-<img> inventory. Two of them are bounded by what the
// page captures today and SAY SO in their own reasoning rather than passing
// on unverified images: `broken_images` needs a per-image HTTP status nothing
// writes yet, and `image_oversized` falls back to srcset `w` descriptors
// because transfer bytes need a fetch. Both gaps are filed in FOUND_DEFECTS.md.

/** Raster/vector format from a URL path extension, null when unknowable. */
function imageFormat(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = urlSplit(url).path.toLowerCase();
  const tail = path.slice(path.lastIndexOf("/") + 1);
  if (!tail.includes(".")) return null;
  const suffix = tail.slice(tail.lastIndexOf(".") + 1);
  if (!IMAGE_EXTENSIONS.has(suffix)) return null;
  return IMAGE_FORMAT_ALIASES[suffix] ?? suffix;
}

/** Python `isinstance(value, int)` for a JSON number. */
function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/** The usable per-image inventory, or the `n_a` that explains its absence. */
function inventoryOrReason(
  ev: PageEvidence,
): [PageImageItem[], CheckOutcome | null] {
  if (ev.imageCount === 0) {
    return [[], outcome("n_a", null, "No images on this page.")];
  }
  const items = (ev.imageItems ?? []).filter(
    (item): item is PageImageItem => typeof item === "object" && item !== null,
  );
  if (items.length === 0) {
    return [
      [],
      outcome(
        "n_a",
        null,
        "We haven't listed this page's images yet.",
        0,
        null,
        RECAPTURE_PAGE,
      ),
    ];
  }
  return [items, null];
}

/**
 * Hosts/paths that serve measurement pixels, not pictures. A visitor never
 * sees them, so a missing alt, width or status on one is not a defect.
 */
const TRACKER_IMAGE_PATTERN = new RegExp(
  "(?:facebook\\.com/tr[/?]|connect\\.facebook\\.net|px\\.ads\\.linkedin\\.com|" +
    "linkedin\\.com/px|snap\\.licdn\\.com|google-analytics\\.com|googletagmanager\\.com|" +
    "doubleclick\\.net|googleadservices\\.com|google\\.com/(?:pagead|ads)/|bat\\.bing\\.com|" +
    "analytics\\.twitter\\.com|t\\.co/i/adsct|ads-twitter\\.com|px\\.ads\\.|" +
    "pixel\\.wp\\.com|stats\\.wp\\.com|pixel\\.quantserve\\.com|ct\\.pinterest\\.com|" +
    "analytics\\.tiktok\\.com|clarity\\.ms|hotjar\\.com|(?:^|/)(?:1x1|pixel|spacer|blank)\\.(?:gif|png)(?:\\?|$))",
  "i",
);

function isPixelOrTrackerImage(item: PageImageItem): boolean {
  if (item.width === 1 && item.height === 1) return true;
  if (item.natural_width === 1 && item.natural_height === 1) return true;
  return TRACKER_IMAGE_PATTERN.test(String(item.src || ""));
}

/**
 * The images a visitor can see: not a script placeholder (no src), not a
 * 1x1/tracking pixel, not markup that only exists with JavaScript off.
 */
function contentImages(items: PageImageItem[]): PageImageItem[] {
  return items.filter(
    (item) => Boolean(item.src) && !item.in_noscript && !isPixelOrTrackerImage(item),
  );
}

const NO_CONTENT_IMAGES =
  "This page has no content images to judge (only script placeholders, tracking pixels " +
  "or no-script fallbacks).";

/** header / footer / content — from the capture, else from a logo-looking name. */
function imageRegionOf(item: PageImageItem): string {
  const region = item.region;
  if (region === "header" || region === "footer" || region === "content") {
    return region;
  }
  const name = `${item.src || ""} ${item.alt || ""}`.toLowerCase();
  return name.includes("logo") ? "header" : "content";
}

export function checkImageAltPresence(ev: PageEvidence): CheckOutcome {
  const total = ev.imageCount;
  if (total === null || total === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't listed this page's images yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (total === 0) return outcome("n_a", null, "No images on this page.");
  const allItems = (ev.imageItems ?? []).filter(
    (item): item is PageImageItem => typeof item === "object" && item !== null,
  );
  if (allItems.length === 0) {
    // A pre-inventory snapshot's missing_alt counted `alt=""` (a valid
    // decorative marker) as missing, so an incomplete inventory is not judged.
    return outcome(
      "n_a",
      null,
      "This page was captured before its images were listed one by one, so " +
        "decorative images (empty alt) cannot be told from missing alt text.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const items = contentImages(allItems);
  if (items.length === 0) return outcome("n_a", null, NO_CONTENT_IMAGES);
  // Explicit alt="" marks a decorative image: valid, and out of the denominator.
  const meaningful = items.filter((item) => item.alt !== "");
  if (meaningful.length === 0) {
    return outcome(
      "pass",
      100,
      `All ${items.length} images are marked decorative (empty alt).`,
    );
  }
  const missing = meaningful.filter(
    (item) => item.alt === null || item.alt === undefined,
  ).length;
  const count = meaningful.length;
  if (missing === 0) {
    return outcome("pass", 100, `All ${count} meaningful images carry alt text.`);
  }
  const ratio = missing / count;
  const score = clampScore(pythonRound(100 * (1 - ratio)));
  const status: CheckStatus =
    ratio >= IMAGE_ALT_FAIL_RATIO || missing >= IMAGE_ALT_FAIL_COUNT
      ? "fail"
      : "warn";
  return outcome(
    status,
    score,
    `${missing} of ${count} images have no alt text — invisible to image ` +
      "search and screen readers.",
    missing,
  );
}

/** Names the inventory cap when the page carried more images than we kept. */
function inventoryNote(ev: PageEvidence, items: PageImageItem[]): string {
  const total = ev.imageCount;
  if (isInt(total) && total > items.length) {
    return ` (measured over the first ${items.length} of ${total} images)`;
  }
  return "";
}

/**
 * Width/height on every <img> — the main image-driven CLS prevention.
 *
 * A CSS `aspect-ratio` reserves space just as well but is invisible to an
 * HTML-only audit, so a page styled that way scores low here. That is the
 * documented limit of the evidence, not a hidden assumption.
 */
export function checkImageDimensionAttrs(ev: PageEvidence): CheckOutcome {
  const [inventory, unavailable] = inventoryOrReason(ev);
  if (unavailable) return unavailable;
  const items = contentImages(inventory);
  if (items.length === 0) return outcome("n_a", null, NO_CONTENT_IMAGES);
  const missing = items
    .filter(
      (item) =>
        item.width === null ||
        item.width === undefined ||
        item.height === null ||
        item.height === undefined,
    )
    .map((item) => String(item.src));
  const total = items.length;
  const covered = total - missing.length;
  const coverage = covered / total;
  const score = clampScore(pythonRound(100 * coverage));
  const note = inventoryNote(ev, items);
  if (coverage >= IMAGE_DIMENSION_ATTR_PASS_COVERAGE) {
    return outcome(
      "pass",
      score,
      `${covered} of ${total} images declare width and height${note}.`,
      missing.length,
      missing.length ? { missing_dimensions: sampleUrls(missing) } : null,
    );
  }
  const status: CheckStatus =
    coverage < IMAGE_DIMENSION_ATTR_FAIL_COVERAGE ? "fail" : "warn";
  return outcome(
    status,
    score,
    `${missing.length} of ${total} images declare no width/height${note} — the browser ` +
      "cannot reserve space for them, so the page jumps as they load (layout shift).",
    missing.length,
    { missing_dimensions: sampleUrls(missing) },
  );
}

/**
 * Lazy below the fold, eager above it — and never lazy on the hero.
 *
 * Viewport geometry is not captured, so "above the fold" is approximated by
 * DOM order (the first `IMAGE_ABOVE_FOLD_DOM_COUNT` content images) plus the
 * page's own featured/OG image; header images are above the fold by
 * construction and footer images are not judged.
 */
export function checkImageLazyLoading(ev: PageEvidence): CheckOutcome {
  const [inventory, unavailable] = inventoryOrReason(ev);
  if (unavailable) return unavailable;

  const isLazy = (item: PageImageItem): boolean =>
    String(item.loading || "")
      .trim()
      .toLowerCase() === "lazy" || item.js_lazy === true;

  const visible = contentImages(inventory);
  if (visible.length === 0) {
    return outcome(
      "n_a",
      null,
      "This page's images are placed by a lazy-loading script, are tracking pixels, or " +
        "sit in no-script fallbacks, so their loading policy cannot be judged from the " +
        "page source.",
    );
  }
  const allRegions = visible.map((item) => imageRegionOf(item));
  const items = visible.filter((_item, index) => allRegions[index] !== "footer");
  const regions = allRegions.filter((region) => region !== "footer");
  if (items.length === 0) {
    return outcome(
      "n_a",
      null,
      "This page's only images sit in its footer, which is not judged.",
    );
  }
  let contentSeen = 0;
  const aboveFoldIndexes = new Set<number>();
  items.forEach((item, index) => {
    if (regions[index] === "header") {
      aboveFoldIndexes.add(index);
      return;
    }
    if (contentSeen < IMAGE_ABOVE_FOLD_DOM_COUNT || item.featured === true) {
      aboveFoldIndexes.add(index);
    }
    contentSeen += 1;
  });
  const aboveFold = items.filter((_item, index) => aboveFoldIndexes.has(index));
  const belowFold = items.filter((_item, index) => !aboveFoldIndexes.has(index));
  const note = inventoryNote(ev, items);

  const heroLazy = aboveFold
    .filter((item) => isLazy(item))
    .map((item) => item.src || "(no src)");
  if (heroLazy.length) {
    return outcome(
      "fail",
      30,
      `${heroLazy.length} image(s) at the top of the page are lazy-loaded — ` +
        "lazy-loading the hero/LCP image delays the largest paint the browser " +
        "measures and is a known Core Web Vitals killer.",
      heroLazy.length,
      { lazy_above_fold: sampleUrls(heroLazy) },
    );
  }

  const eagerBelow = belowFold
    .filter((item) => !isLazy(item))
    .map((item) => item.src || "(no src)");
  if (eagerBelow.length === 0) {
    return outcome(
      "pass",
      100,
      `Lazy-loading policy is correct in both directions across ${items.length} images${note}.`,
    );
  }
  const ratio = eagerBelow.length / belowFold.length;
  const score = ratio > IMAGE_BELOW_FOLD_EAGER_FAIL_RATIO ? 60 : 80;
  return outcome(
    "warn",
    score,
    `${eagerBelow.length} of ${belowFold.length} images below the fold load eagerly${note} — ` +
      "the browser downloads them before the visitor can possibly see them.",
    eagerBelow.length,
    { eager_below_fold: sampleUrls(eagerBelow) },
  );
}

/**
 * Below this many legacy-format image bytes a page has no "significant raster
 * images" (the catalog row scores 100) — WebP would save a few KB.
 */
export const IMAGE_MODERN_FORMAT_MIN_LEGACY_BYTES = 50_000;
const TRACKER_HOST_MARKERS = [
  "px.ads.",
  "pixel.",
  "doubleclick.",
  "googleadservices.",
  "google-analytics.",
  "googletagmanager.",
  "facebook.com/tr",
  "facebook.net",
  "bat.bing.",
  "adsystem.",
  "scorecardresearch.",
  "hotjar.",
  "clarity.ms",
];
const TRACKER_PATH_MARKERS = [
  "/collect",
  "/pixel",
  "/beacon",
  "/track",
  "/impression",
  "/tr?",
];
const MEASURED_IMAGE_CAPTURE_STATUSES: ReadonlySet<string> = new Set([
  "complete",
  "http_error",
  "too_large",
]);

/** A tracking pixel or beacon is not content; it never counts as an image. */
function isTrackingImage(item: PageImageItem): boolean {
  for (const key of ["final_url", "src"] as const) {
    const url = String(item[key] || "").toLowerCase();
    if (!url) continue;
    const at = url.indexOf("://");
    const stripped = at >= 0 ? url.slice(at + 3) : url;
    if (TRACKER_HOST_MARKERS.some((marker) => stripped.includes(marker))) return true;
    if (TRACKER_PATH_MARKERS.some((marker) => stripped.includes(marker))) return true;
  }
  return false;
}

/**
 * Share of raster image BYTES served as WebP/AVIF instead of JPEG/PNG/GIF.
 *
 * Uses captured transfer bytes and response content type, including the
 * preferred `<picture>` source rather than its legacy `<img>` fallback.
 */
export function checkImageModernFormat(ev: PageEvidence): CheckOutcome {
  const [items, unavailable] = inventoryOrReason(ev);
  if (unavailable) return unavailable;

  const measured = items.filter(
    (item) =>
      isInt(item.bytes) &&
      item.bytes >= 0 &&
      MEASURED_IMAGE_CAPTURE_STATUSES.has(String(item.capture_status)) &&
      !isTrackingImage(item),
  );
  if (measured.length === 0) {
    return outcome(
      "n_a",
      null,
      "Image transfer sizes have not been captured, so the promised byte-weighted " +
        "modern-format share cannot be calculated.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }

  let modernBytes = 0;
  let legacyBytes = 0;
  const legacy: string[] = [];
  for (const item of measured) {
    const byteCount = item.bytes as number;
    const offered = new Set(
      (item.picture_formats || []).map((format) => String(format).toLowerCase()),
    );
    const actual = String(item.actual_format || "").toLowerCase();
    const candidates = [item.final_url, item.src, ...(item.srcset || [])];
    const formats = new Set<string>([actual]);
    for (const url of candidates) {
      const format = imageFormat(typeof url === "string" ? url : null);
      if (format) formats.add(format);
    }
    if (
      IMAGE_MODERN_RASTER_FORMATS.has(actual) ||
      (!actual &&
        [...offered].some((format) => IMAGE_MODERN_RASTER_FORMATS.has(format)))
    ) {
      modernBytes += byteCount;
    } else if ([...formats].some((format) => IMAGE_LEGACY_RASTER_FORMATS.has(format))) {
      legacyBytes += byteCount;
      legacy.push(item.src || "(no src)");
    }
  }

  const classified = modernBytes + legacyBytes;
  const note = inventoryNote(ev, items);
  if (classified === 0) {
    return outcome(
      "n_a",
      null,
      `None of the ${measured.length} measured images had a classifiable raster format.`,
    );
  }
  const coverage = modernBytes / classified;
  const score = clampScore(pythonRound(100 * coverage));
  if (coverage >= IMAGE_MODERN_FORMAT_PASS_COVERAGE) {
    return outcome(
      "pass",
      score,
      `${modernBytes} of ${classified} measured raster bytes are WebP/AVIF${note}.`,
      legacy.length,
    );
  }
  if (legacyBytes < IMAGE_MODERN_FORMAT_MIN_LEGACY_BYTES) {
    return outcome(
      "pass",
      100,
      `Only ${legacyBytes} bytes of this page's images are JPEG/PNG/GIF${note} — ` +
        "too little for WebP or AVIF to be worth chasing.",
      legacy.length,
    );
  }
  const status: CheckStatus =
    coverage < IMAGE_MODERN_FORMAT_FAIL_COVERAGE ? "fail" : "warn";
  return outcome(
    status,
    score,
    `${legacyBytes} of ${classified} measured raster bytes are JPEG/PNG/GIF${note} — ` +
      "WebP or AVIF typically cuts those downloads by a quarter to a half.",
    legacy.length,
    { legacy_format_images: sampleUrls(legacy) },
  );
}

/**
 * Images delivered far larger than the box they are drawn into.
 *
 * Scores captured transfer-byte bands and decoded natural width against the
 * declared display width. Missing capture remains `n_a`.
 */
export function checkImageOversized(ev: PageEvidence): CheckOutcome {
  const [items, unavailable] = inventoryOrReason(ev);
  if (unavailable) return unavailable;

  const measured: [string, number, number, number, number][] = [];
  for (const item of items) {
    const display = item.width;
    const intrinsic = item.natural_width;
    const byteCount = item.bytes;
    if (
      !isInt(display) ||
      display <= 0 ||
      !isInt(intrinsic) ||
      intrinsic <= 0 ||
      !isInt(byteCount) ||
      byteCount < 0
    ) {
      continue;
    }
    measured.push([
      item.src || "(no src)",
      intrinsic / display,
      intrinsic,
      display,
      byteCount,
    ]);
  }

  if (measured.length === 0) {
    return outcome(
      "n_a",
      null,
      "No image has all three measurements needed here: display width, decoded " +
        "natural width, and transfer bytes.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }

  // Python's sort is stable; so is Array.prototype.sort.
  measured.sort((left, right) => right[1] - left[1]);
  const [worstSrc, worstRatio, worstIntrinsic, worstDisplay] = measured[0];
  const offenders = measured
    .filter(
      ([, ratio, , , byteCount]) =>
        ratio > IMAGE_OVERSIZE_MINOR_RATIO || byteCount > IMAGE_OVERSIZE_WARN_BYTES,
    )
    .map(
      ([src, , intrinsic, display, byteCount]) =>
        `${src} (${intrinsic}px for a ${display}px slot; ${byteCount} bytes)`,
    );
  const worstBytes = Math.max(...measured.map((row) => row[4]));
  const estimatedWasteBytes = measured.reduce(
    (sum, [, , intrinsic, display, byteCount]) =>
      sum +
      pythonRound(byteCount * (1 - Math.min(1.0, (display / intrinsic) ** 2))),
    0,
  );
  if (worstRatio <= IMAGE_OVERSIZE_MINOR_RATIO && worstBytes <= IMAGE_OVERSIZE_WARN_BYTES) {
    return outcome(
      "pass",
      100,
      `All ${measured.length} measurable images are sized for their slot ` +
        `(worst case ${pyFixed(worstRatio, 1)}x and ${worstBytes} bytes).`,
    );
  }
  const detail =
    `the worst is ${worstIntrinsic}px wide for a ${worstDisplay}px slot ` +
    `(${pyFixed(worstRatio, 1)}x): ${worstSrc}`;
  let status: CheckStatus;
  let score: number;
  if (worstRatio > IMAGE_OVERSIZE_SEVERE_RATIO || worstBytes > IMAGE_OVERSIZE_FAIL_BYTES) {
    status = "fail";
    score = 25;
  } else if (worstRatio > IMAGE_OVERSIZE_MAJOR_RATIO || worstBytes > IMAGE_OVERSIZE_WARN_BYTES) {
    status = "warn";
    score = 50;
  } else {
    status = "warn";
    score = 80;
  }
  return outcome(
    status,
    score,
    `${offenders.length} image(s) are delivered far larger than they are displayed — ` +
      `${detail}. Estimated avoidable transfer is ${estimatedWasteBytes} bytes.`,
    offenders.length,
    {
      oversized_images: sampleUrls(offenders),
      estimated_waste_bytes: estimatedWasteBytes,
      largest_image_bytes: worstBytes,
    },
  );
}

/**
 * <img> sources that return 4xx/5xx (or a non-image body).
 *
 * Uses the bounded image evidence captured before snapshot persistence. A
 * network failure or old snapshot without statuses remains `n_a`.
 */
export function checkBrokenImages(ev: PageEvidence): CheckOutcome {
  const [inventory, unavailable] = inventoryOrReason(ev);
  if (unavailable) return unavailable;
  const items = contentImages(inventory);
  if (items.length === 0) return outcome("n_a", null, NO_CONTENT_IMAGES);
  const statuses = items
    .filter((item) => isInt(item.http_status))
    .map(
      (item) =>
        [item.src || "(no src)", item.http_status as number, item.content_type] as const,
    );
  if (statuses.length === 0) {
    return outcome(
      "n_a",
      null,
      `None of this page's ${items.length} images have been status-checked — the ` +
        "crawl fetches pages, not their images, so whether they load is unverified.",
    );
  }
  const broken = statuses
    .filter(
      ([, status, contentType]) =>
        status === 0 ||
        status >= 400 ||
        (typeof contentType === "string" &&
          !contentType.toLowerCase().startsWith("image/")),
    )
    .map(([src]) => src);
  if (broken.length === 0 && statuses.length < items.length) {
    return outcome(
      "n_a",
      null,
      `Only ${statuses.length} of ${items.length} inventoried images returned a status; ` +
        "the unchecked remainder prevents a reliable all-clear.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (broken.length === 0) {
    return outcome(
      "pass",
      100,
      `All ${statuses.length} status-checked images load.`,
    );
  }
  const score = broken.length >= BROKEN_IMAGE_FAIL_COUNT ? 25 : 50;
  return outcome(
    "fail",
    score,
    `${broken.length} image(s) on this page do not load — visitors see a broken ` +
      "icon where a picture should be.",
    broken.length,
    { broken_images: sampleUrls(broken) },
  );
}

// --- Redirect intent -------------------------------------------------------

/**
 * 302/307 where a 301/308 was meant.
 *
 * ⚠️ SINGLE-SESSION TIER ONLY. The catalog row scores a 302 that survives
 * three or more crawls harder than one seen once; this sweep reads
 * only the latest accepted snapshot per page, so that tier is not evaluated
 * here and this check never claims it.
 */
export function checkTemporaryRedirectUsage(ev: PageEvidence): CheckOutcome {
  const chain = ev.redirectChain ?? [];
  const status = ev.httpStatus;
  const known = chain
    .map((hop) => hop?.status)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isInteger(value),
    );
  const temporarySet = new Set(
    known.filter((code) => TEMPORARY_REDIRECT_STATUSES.has(code)),
  );
  if (
    typeof status === "number" &&
    Number.isInteger(status) &&
    TEMPORARY_REDIRECT_STATUSES.has(status)
  ) {
    temporarySet.add(status);
  }
  const temporary = [...temporarySet].sort((a, b) => a - b);

  if (temporary.length) {
    const codes = temporary.join("/");
    return outcome(
      "warn",
      65,
      `This URL redirects with a temporary ${codes} — search engines keep the ` +
        "old address and pass none of its earned authority to the destination. " +
        "A move you do not plan to undo should be a 301.",
      temporary.length,
      {
        temporary_statuses: temporary,
        redirect_chain: sampleUrls(chainUrls(ev)),
      },
    );
  }
  if (known.length) {
    const redirects = known.filter((code) => code >= 300 && code < 400);
    if (
      typeof status === "number" &&
      Number.isInteger(status) &&
      status >= 300 &&
      status < 400
    ) {
      redirects.push(status);
    }
    return outcome(
      "pass",
      100,
      redirects.length
        ? "Every redirect on the way to this page is permanent (301/308)."
        : "No redirect — the URL serves content directly.",
    );
  }
  if (chain.length || (status !== null && status !== undefined)) {
    // A chain was recorded but its hop statuses were not — older captures
    // stored URLs only. Nothing to judge; say so rather than passing.
    if (chain.length) {
      return outcome(
        "n_a",
        null,
        "We recorded this page's redirects but not the kind of redirect they " +
          "were, so we can't tell temporary from permanent.",
        0,
        null,
        RECAPTURE_PAGE,
      );
    }
    return outcome(
      "pass",
      100,
      "No redirect — the URL serves content directly.",
    );
  }
  return outcome(
    "n_a",
    null,
    "We haven't fetched this URL yet, so we don't know whether it redirects.",
    0,
    null,
    RECAPTURE_PAGE,
  );
}

/**
 * A 200 that is really an error page.
 *
 * ⚠️ Two of the catalog row's signals need evidence this per-page check
 * cannot see (a hash match against the SITE's own 404 template, and a redirect
 * to a generic error page). Only the page-local signals are scored here.
 */
export function checkSoft404Detection(ev: PageEvidence): CheckOutcome {
  const status = ev.httpStatus;
  if (status === null || status === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't fetched this URL yet, so we don't know what it answers with.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (status !== 200) {
    return outcome(
      "pass",
      100,
      `This URL answers with HTTP ${status} — whatever it is, it is not ` +
        "pretending to be a working page.",
    );
  }
  const words = ev.wordCount;
  if (words === null || words === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't counted the words on this page yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const phrasing = Boolean(ev.title && SOFT_404_TITLE_PATTERN.test(ev.title));
  const nearlyEmpty = words < SOFT_404_PHRASE_MAX_WORDS;
  const evidence = {
    word_count: words,
    title: ev.title ?? null,
    http_status: status,
  };

  if (phrasing && nearlyEmpty) {
    return outcome(
      "fail",
      15,
      `This page answers HTTP 200 while its title says "${ev.title}" and it ` +
        `carries only ${words} words — it is an error page in disguise. Search ` +
        "engines index it as a real page and visitors hit a dead end.",
      1,
      evidence,
    );
  }
  // Word count alone is the thin-content check's finding. A soft 404 needs an
  // error-page signal (not-found phrasing, above) or a page with no extracted
  // content at all: nothing counted AND no heading anywhere.
  const blank =
    words < SOFT_404_EMPTY_MAX_WORDS &&
    !(ev.headings && ev.headings.length) &&
    !ev.h1Count;
  if (blank && ev.headings !== null && ev.headings !== undefined) {
    return outcome(
      "warn",
      40,
      `This page answers HTTP 200 with only ${words} words and no heading — there ` +
        "is nothing here, which is what a broken or removed page usually looks like.",
      1,
      evidence,
    );
  }
  if (phrasing) {
    return outcome(
      "warn",
      70,
      "This page answers HTTP 200 but its title reads like an error page " +
        `("${ev.title}"). If the page is genuinely gone it should answer 404 or 410.`,
      1,
      evidence,
    );
  }
  if (nearlyEmpty) {
    return outcome(
      "pass",
      100,
      `This page answers HTTP 200 with ${words} words but shows no error-page ` +
        "signal (no not-found title, headings present) — short, not broken; the " +
        "thin-content check covers its length.",
      0,
      evidence,
    );
  }
  return outcome(
    "pass",
    100,
    "This page answers HTTP 200 and serves real content.",
  );
}

/**
 * Served over HTTPS, and no HTTP duplicate left reachable.
 *
 * Two independent facts. The FIRST is free — the URL's own scheme. The SECOND
 * needs a probe of the URL's http:// variant, which the crawler does not
 * perform today; a check is pure and NEVER fetches, so without the probe this
 * answers `n_a` rather than passing on evidence nobody collected.
 */
export function checkHttpsEnforcement(ev: PageEvidence): CheckOutcome {
  const scheme = urlSplit(ev.url).scheme.toLowerCase();
  if (scheme !== "http" && scheme !== "https") {
    return outcome(
      "n_a",
      null,
      `Not an http(s) URL (${sliceCodePoints(ev.url, 120)}).`,
    );
  }
  if (scheme === "http") {
    return outcome(
      "fail",
      5,
      "This page is served over plain HTTP — browsers mark it 'Not secure', " +
        "the content can be read and rewritten in transit, and Google has " +
        "treated HTTPS as a ranking signal since 2014.",
      1,
      { scheme: "http", url: ev.url },
    );
  }

  const probe = ev.httpVariantProbe;
  const status =
    probe && typeof probe === "object" ? probe["status"] : undefined;
  if (typeof status !== "number" || !Number.isInteger(status)) {
    return outcome(
      "n_a",
      null,
      "This page is served securely. We haven't checked whether an insecure " +
        "copy of it is also reachable — this page wasn't in the sample we probed.",
      0,
      { scheme: "https" },
    );
  }

  const location =
    probe && typeof probe === "object" ? probe["location"] : undefined;
  const targetScheme = location
    ? urlSplit(String(location)).scheme.toLowerCase()
    : "";
  if (status >= 200 && status < 300) {
    return outcome(
      "fail",
      30,
      `The http:// variant of this URL answers HTTP ${status} instead of ` +
        "redirecting — the page is live at two addresses, splitting its " +
        "signals and leaving an insecure copy indexable.",
      1,
      { http_variant: probe },
    );
  }
  if (status >= 300 && status < 400) {
    if (targetScheme && targetScheme !== "https") {
      return outcome(
        "fail",
        30,
        `The http:// variant redirects (HTTP ${status}) but lands on ` +
          `${targetScheme}:// — the insecure address is never left behind.`,
        1,
        { http_variant: probe },
      );
    }
    if (HTTP_VARIANT_PERMANENT_REDIRECTS.has(status)) {
      return outcome(
        "pass",
        100,
        "Served over HTTPS, and the http:// variant redirects permanently " +
          `(HTTP ${status}).`,
        0,
        { http_variant: probe },
      );
    }
    return outcome(
      "warn",
      70,
      `The http:// variant redirects with HTTP ${status} rather than a ` +
        "permanent 301/308 — a temporary redirect tells crawlers the insecure " +
        "URL is still the real one and passes signals grudgingly.",
      1,
      { http_variant: probe },
    );
  }
  // 4xx / 5xx / 0 on the http:// variant: there is no insecure duplicate to
  // consolidate. Not the textbook redirect, but nothing is reachable over HTTP.
  return outcome(
    "pass",
    100,
    `Served over HTTPS, and the http:// variant is not reachable (HTTP ${status}).`,
    0,
    { http_variant: probe },
  );
}

// --- Mobile rendering ------------------------------------------------------

/** `width=device-width, initial-scale=1` → {width: "device-width", …}. */
function parseViewport(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const part of content.split(",")) {
    const index = part.indexOf("=");
    const key = (index === -1 ? part : part.slice(0, index)).trim().toLowerCase();
    const value = index === -1 ? "" : part.slice(index + 1).trim().toLowerCase();
    if (key) parsed[key] = value;
  }
  return parsed;
}

/**
 * The single tag that decides whether a phone renders the page at all.
 *
 * Without it every mobile browser lays the page out at ~980 CSS px and then
 * shrinks it, so the site is a pinch-and-pan desktop page on a phone — which
 * is what Google's mobile-first index actually sees.
 */
export function checkViewportMeta(ev: PageEvidence): CheckOutcome {
  if (ev.headMeta === null || ev.headMeta === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded this page's mobile viewport tag yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const raw = ev.headMeta["viewport"];
  const content = typeof raw === "string" ? raw.trim() : "";
  if (!content) {
    return outcome(
      "fail",
      20,
      "This page has no viewport tag, so phones render it as a shrunken " +
        "desktop page. Google indexes the mobile version — this is the single " +
        "biggest mobile-rendering defect a page can have.",
      1,
    );
  }
  const directives = parseViewport(content);
  const width = directives["width"] ?? "";
  if (width !== "device-width") {
    return outcome(
      "fail",
      40,
      width
        ? `The viewport is fixed at "${width}" instead of the device width — ` +
            "the page cannot adapt to the screen it is on."
        : "The viewport tag never sets a width, so phones fall back to a " +
            "desktop-width layout.",
      1,
      { viewport: content },
    );
  }
  const lockouts: string[] = [];
  if (VIEWPORT_ZOOM_DISABLED_VALUES.has(directives["user-scalable"] ?? "")) {
    lockouts.push("user-scalable=no");
  }
  const rawMaxScale = directives["maximum-scale"];
  const maxScale =
    rawMaxScale !== undefined && pyFloatable(rawMaxScale)
      ? Number(rawMaxScale)
      : null;
  if (maxScale !== null && maxScale <= VIEWPORT_ZOOM_LOCK_MAX_SCALE) {
    lockouts.push(`maximum-scale=${rawMaxScale}`);
  }
  if (lockouts.length) {
    return outcome(
      "warn",
      60,
      `The viewport is responsive but blocks zoom (${lockouts.join(", ")}) — ` +
        "anyone who needs to enlarge the text cannot, which fails accessibility " +
        "guidelines and drives real visitors away.",
      lockouts.length,
      { viewport: content },
    );
  }
  return outcome("pass", 100, `Responsive viewport declared ("${content}").`);
}

/** Whether Python's `float(value)` would succeed on this string. */
function pyFloatable(value: string): boolean {
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(value.trim());
}

// --- Language --------------------------------------------------------------

/**
 * Well-formed BCP-47: language[-script][-region][-variant…][-extension…].
 * Structural only — this says the tag is SHAPED right, never that the content
 * is in that language (nothing in a crawl snapshot detects content language).
 */
const BCP47_RE =
  /^[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-(?:[0-9A-Za-z]{5,8}|[0-9][0-9A-Za-z]{3}))*(?:-[0-9A-WY-Za-wy-z](?:-[0-9A-Za-z]{2,8})+)*(?:-x(?:-[0-9A-Za-z]{1,8})+)?$/;

export function checkHtmlLangValidity(ev: PageEvidence): CheckOutcome {
  if (!ev.headCaptured) {
    return outcome(
      "n_a",
      null,
      "We haven't read this page's markup yet, so its language tag is unknown.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const lang = (ev.lang ?? "").trim();
  if (!lang) {
    return outcome(
      "warn",
      55,
      "The <html> tag declares no language. Screen readers pick the wrong " +
        "voice, browsers offer the wrong translation, and search engines have " +
        "to guess which country's results this page belongs in.",
      1,
    );
  }
  if (!BCP47_RE.test(lang) || lang.toLowerCase().startsWith("x-")) {
    return outcome(
      "fail",
      45,
      `The declared language "${sliceCodePoints(lang, 60)}" is not a valid language code — ` +
        "it is ignored exactly as if it were missing. Use a standard code " +
        'such as "en" or "en-US".',
      1,
      { lang },
    );
  }
  return outcome(
    "pass",
    100,
    `Language declared as "${lang}", a valid code. (Whether the writing is ` +
      "actually in that language is not measured from a crawl.)",
  );
}

// --- Social cards ----------------------------------------------------------

function urlExtension(url: string): string {
  const path = urlSplit(url).path;
  return path.includes(".") ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "";
}

/**
 * URL equality for canonical-vs-og:url — scheme/host case and the trailing
 * slash are noise, everything else is a real difference.
 */
function sameTarget(a: string, b: string): boolean {
  const left = urlSplit(a);
  const right = urlSplit(b);
  return (
    left.scheme.toLowerCase() === right.scheme.toLowerCase() &&
    left.netloc.toLowerCase() === right.netloc.toLowerCase() &&
    rstripSlashes(left.path || "/") === rstripSlashes(right.path || "/") &&
    left.query === right.query
  );
}

/**
 * The picture that appears when the page is shared.
 *
 * A crawl can prove the tag exists and points somewhere a share crawler can
 * fetch; it cannot prove the pixels are big enough, because that needs the
 * image itself. The reasoning says which half was measured.
 */
export function checkOgImageValidity(ev: PageEvidence): CheckOutcome {
  if (!ev.headCaptured) {
    return outcome(
      "n_a",
      null,
      "We haven't read this page's markup yet, so its share tags are unknown.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const raw = ev.og?.["og:image"];
  const image = typeof raw === "string" ? raw.trim() : "";
  if (!image) {
    return outcome(
      "fail",
      45,
      "No share image (og:image) — links to this page may share without a " +
        "picture on networks that read Open Graph tags." +
        (String(ev.twitter?.["twitter:image"] || "").trim()
          ? " X can still show the twitter:image."
          : ""),
      1,
    );
  }
  if (!image.startsWith("http://") && !image.startsWith("https://")) {
    return outcome(
      "fail",
      45,
      `The share image is not a full web address ("${sliceCodePoints(image, 120)}"). Facebook, ` +
        "LinkedIn and X do not resolve relative paths, so no image is shown.",
      1,
      { og_image: image },
    );
  }
  const extension = urlExtension(image);
  if (extension && !OG_IMAGE_SUPPORTED_EXTENSIONS.has(extension)) {
    return outcome(
      "warn",
      55,
      `The share image is a .${extension} file, which the social networks do ` +
        `not render. Use one of: ${[...OG_IMAGE_SUPPORTED_EXTENSIONS].sort().join(", ")}.`,
      1,
      { og_image: image },
    );
  }
  return outcome(
    "pass",
    100,
    `Share image declared as a full web address (${sliceCodePoints(image, 160)}). Its pixel ` +
      "size is not measured here — that needs the image file itself.",
    0,
    { og_image: image },
  );
}

export function checkSocialMetaCompleteness(ev: PageEvidence): CheckOutcome {
  if (!ev.headCaptured) {
    return outcome(
      "n_a",
      null,
      "We haven't read this page's markup yet, so its share tags are unknown.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const og = ev.og ?? {};
  // og:image is judged — and reported — by `checkOgImageValidity` only; this
  // check covers the other four (contract amended 2026-10-14: /4).
  const required = SOCIAL_REQUIRED_OG_TAGS.filter((tag) => tag !== "og:image");
  const missing = required.filter((tag) => {
    const value = og[tag];
    return !(typeof value === "string" && value.trim());
  });
  const present = required.length - missing.length;
  const twitterCard = ev.twitter?.["twitter:card"];
  const hasTwitterCard =
    typeof twitterCard === "string" && Boolean(twitterCard.trim());

  const ogUrl = (og["og:url"] ?? "").trim();
  const canonical = (ev.canonicalUrl ?? "").trim();
  const conflicts = Boolean(
    ogUrl &&
      canonical &&
      (ogUrl.startsWith("http://") || ogUrl.startsWith("https://")) &&
      (canonical.startsWith("http://") || canonical.startsWith("https://")) &&
      !sameTarget(ogUrl, canonical),
  );

  let score = pythonRound((100 * present) / required.length);
  if (conflicts) score -= SOCIAL_OG_URL_CONFLICT_PENALTY;
  if (!hasTwitterCard) score -= SOCIAL_NO_TWITTER_CARD_PENALTY;
  score = clampScore(score);

  const problems: string[] = [];
  if (missing.length) problems.push(`missing ${missing.join(", ")}`);
  if (!hasTwitterCard)
    problems.push("no twitter:card, so X falls back to a small preview");
  if (conflicts) {
    problems.push(
      `og:url (${sliceCodePoints(ogUrl, 100)}) disagrees with the canonical URL ` +
        `(${sliceCodePoints(canonical, 100)}), so shares may credit the wrong page`,
    );
  }
  const evidence: Record<string, unknown> = {
    missing_og_tags: missing,
    twitter_card: hasTwitterCard ? twitterCard : null,
    og_url: ogUrl || null,
    canonical_url: canonical || null,
  };
  if (problems.length === 0) {
    return outcome(
      "pass",
      score,
      "Share tags are complete: Open Graph title, description, url and type plus " +
        `a Twitter card ("${twitterCard}"), and og:url agrees with the canonical URL ` +
        "(the share image is judged separately).",
      0,
      evidence,
    );
  }
  const status: CheckStatus =
    score >= SOCIAL_META_PASS_SCORE
      ? "pass"
      : score >= SOCIAL_META_WARN_SCORE
        ? "warn"
        : "fail";
  return outcome(
    status,
    score,
    "Shares of this page will not render a full preview — " +
      problems.join("; ") +
      ".",
    missing.length + (hasTwitterCard ? 0 : 1) + (conflicts ? 1 : 0),
    evidence,
  );
}

// --- Redirects declared in the markup --------------------------------------

/**
 * A `<meta http-equiv="refresh">` standing in for an HTTP redirect.
 *
 * Only the markup half is measured: a crawl snapshot records the tag, not the
 * client-side `location =` assignments that do the same thing in JavaScript,
 * and the reasoning never implies otherwise.
 */
export function checkMetaRefreshRedirect(ev: PageEvidence): CheckOutcome {
  if (ev.headMeta === null || ev.headMeta === undefined) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded this page's refresh tag yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const raw = ev.headMeta["refresh"];
  const content = typeof raw === "string" ? raw.trim() : "";
  if (!content) {
    return outcome(
      "pass",
      100,
      "This page does not redirect itself through a meta refresh tag.",
    );
  }
  const semicolon = content.indexOf(";");
  const delayPart = semicolon === -1 ? content : content.slice(0, semicolon);
  const targetPart = semicolon === -1 ? "" : content.slice(semicolon + 1);
  const equals = targetPart.indexOf("=");
  const target =
    equals === -1
      ? ""
      : targetPart
          .slice(equals + 1)
          .trim()
          .replace(/^['"]+/, "")
          .replace(/['"]+$/, "");
  const delay = pyFloatable(delayPart) ? Number(delayPart.trim()) : 0;
  if (!target) {
    return outcome(
      "pass",
      100,
      `The page reloads itself every ${delayPart.trim() || "0"} seconds but ` +
        "does not send visitors elsewhere, so it is not standing in for a redirect.",
      0,
      { meta_refresh: content },
    );
  }
  if (delay <= META_REFRESH_INSTANT_MAX_SECONDS) {
    return outcome(
      "fail",
      35,
      `This page instantly bounces visitors to ${sliceCodePoints(target, 120)} using a meta ` +
        "refresh tag instead of a real server redirect. Search engines treat " +
        "that as a weaker, slower signal and some ignore it, so the destination " +
        "inherits little of this page's standing.",
      1,
      { meta_refresh: content, target },
    );
  }
  return outcome(
    "warn",
    50,
    `This page shows for ${delayPart.trim()} seconds and then sends visitors ` +
      `to ${sliceCodePoints(target, 120)} via a meta refresh tag. Interstitials like this waste ` +
      "the visit and are a weaker signal than a server redirect.",
    1,
    { meta_refresh: content, target },
  );
}

// --- Structured data -------------------------------------------------------

/** The normalized entity blocks the capture already produced. */
export function structuredDataBlocks(
  structuredData: Record<string, unknown>,
): Record<string, unknown>[] {
  const blocks = structuredData["blocks"];
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(
    (block): block is Record<string, unknown> =>
      typeof block === "object" && block !== null && !Array.isArray(block),
  );
}

function blockTypes(block: Record<string, unknown>): string[] {
  const types = block["types"];
  if (!Array.isArray(types)) return [];
  // Microdata carries full schema.org URLs; the capture already trims those,
  // but RDFa vocabularies can still arrive prefixed.
  return types
    .filter((type) => Boolean(type))
    .map((type) => {
      const trimmed = rstripSlashes(String(type));
      return trimmed.slice(trimmed.lastIndexOf("/") + 1);
    });
}

/** The declared value for `prop`, honoring the accepted alias spellings. */
function propertyValue(node: Record<string, unknown>, prop: string): unknown {
  for (const name of SCHEMA_PROPERTY_ALIASES[prop] ?? [prop]) {
    const value = node[name];
    if (value === null || value === undefined) continue;
    if (value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length === 0
    ) {
      continue;
    }
    return value;
  }
  return null;
}

function missingProperties(
  node: Record<string, unknown>,
  props: readonly string[],
): string[] {
  return props.filter((prop) => propertyValue(node, prop) === null);
}

/** Which rich-result contract a block is claiming, if any. */
export function richResultTypeOf(types: string[]): string | null {
  for (const declared of types) {
    if (Object.hasOwn(RICH_RESULT_REQUIRED_PROPERTIES, declared)) return declared;
  }
  for (const declared of types) {
    // Google publishes recommended-only properties for some types
    // (Organization) and NO required ones; such a type is still validated,
    // just never "required".
    if (Object.hasOwn(RICH_RESULT_RECOMMENDED_PROPERTIES, declared)) return declared;
  }
  for (const declared of types) {
    if (LOCAL_BUSINESS_SUBTYPES.has(declared)) return "LocalBusiness";
  }
  return null;
}

/**
 * Keys a microdata/RDFa extraction adds around a scope's content. A block
 * whose data holds nothing else is an `itemscope` with no `itemprop` inside —
 * a theme wrapper whose "value" is just the element's text. It states no
 * facts, so it cannot be missing any.
 */
const SCOPE_WRAPPER_KEYS: ReadonlySet<string> = new Set([
  "type",
  "types",
  "value",
  "@type",
  "@context",
  "@id",
  "id",
]);

function isPropertylessScope(
  block: Record<string, unknown>,
  data: Record<string, unknown>,
): boolean {
  const source = String(block["source"] || "").toLowerCase();
  if (source === "json-ld" || source === "jsonld" || source === "") return false;
  return Object.keys(data).every((key) => SCOPE_WRAPPER_KEYS.has(key));
}

/**
 * Parse errors and rich-result completeness, from the stored capture.
 *
 * Order is the catalog row's, top-down: a parse error voids the whole
 * script, so it outranks any missing property.
 */
export function checkStructuredDataValidity(ev: PageEvidence): CheckOutcome {
  const payload = ev.structuredData ?? {};
  if (Object.keys(payload).length === 0) {
    return outcome(
      "n_a",
      null,
      "This page has no stored structured-data capture yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }

  const rawErrors = payload["parse_errors"];
  const errors = (Array.isArray(rawErrors) ? rawErrors : []).filter(
    (error): error is Record<string, unknown> =>
      typeof error === "object" && error !== null && !Array.isArray(error),
  );
  if (errors.length) {
    const rawJsonLd = payload["json_ld_raw"];
    const rawScripts = (Array.isArray(rawJsonLd) ? rawJsonLd : []).filter(
      (script): script is string => typeof script === "string",
    );
    const broken = errors
      .slice(0, STRUCTURED_DATA_EVIDENCE_LIMIT)
      .map((error) => {
        const index = error["index"];
        const snippet =
          typeof index === "number" &&
          Number.isInteger(index) &&
          index >= 0 &&
          index < rawScripts.length
            ? sliceCodePoints(rawScripts[index], MALFORMED_SCRIPT_SNIPPET_CHARS)
            : null;
        const entry: Record<string, unknown> = {
          source: error["source"] ?? null,
          message: error["message"] ?? null,
        };
        if (snippet) entry.script = snippet;
        return entry;
      });
    return outcome(
      "fail",
      30,
      `${errors.length} structured-data script(s) on this page could not be ` +
        "read at all — a search engine discards a block it cannot parse, so " +
        "every rich result this page markup was written for is void.",
      errors.length,
      { parse_errors: broken },
    );
  }

  const blocks = structuredDataBlocks(payload);
  if (blocks.length === 0) {
    return outcome(
      "n_a",
      null,
      "This page carries no structured data, so there is nothing to " +
        "validate (whether it SHOULD have some is the coverage check's job).",
    );
  }

  const missingRequired: { type: string; missing: string[] }[] = [];
  const missingRecommended: { type: string; missing: string[] }[] = [];
  const validated: string[] = [];
  for (const block of blocks) {
    const data = block["data"];
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      continue;
    }
    const node = data as Record<string, unknown>;
    if (isPropertylessScope(block, node)) continue;
    const richType = richResultTypeOf(blockTypes(block));
    if (richType === null) continue;
    validated.push(richType);
    const required = missingProperties(
      node,
      RICH_RESULT_REQUIRED_PROPERTIES[richType] ?? [],
    );
    if (required.length) {
      missingRequired.push({ type: richType, missing: required });
      continue;
    }
    const recommended = missingProperties(
      node,
      RICH_RESULT_RECOMMENDED_PROPERTIES[richType] ?? [],
    );
    if (recommended.length) {
      missingRecommended.push({ type: richType, missing: recommended });
    }
  }

  if (missingRequired.length) {
    const named = missingRequired
      .map((item) => `${item.type} (no ${item.missing.join(", ")})`)
      .join(", ");
    return outcome(
      "fail",
      50,
      "Structured data on this page is missing properties Google REQUIRES " +
        `for the rich result it describes: ${named}. The markup parses, but ` +
        "it cannot produce the enhanced search listing it was written for.",
      missingRequired.length,
      {
        missing_required: missingRequired.slice(
          0,
          STRUCTURED_DATA_EVIDENCE_LIMIT,
        ),
      },
    );
  }
  if (missingRecommended.length) {
    const named = missingRecommended
      .slice(0, STRUCTURED_DATA_EVIDENCE_LIMIT)
      .map((item) => `${item.type} (no ${item.missing.join(", ")})`)
      .join(", ");
    return outcome(
      "warn",
      75,
      "Structured data is valid, but recommended properties are absent: " +
        `${named}. The rich result will show, with less in it.`,
      missingRecommended.length,
      {
        missing_recommended: missingRecommended.slice(
          0,
          STRUCTURED_DATA_EVIDENCE_LIMIT,
        ),
      },
    );
  }
  if (validated.length === 0) {
    return outcome(
      "pass",
      100,
      `${blocks.length} structured-data block(s) parse cleanly. None of them ` +
        "claims a rich-result type with published property requirements.",
    );
  }
  return outcome(
    "pass",
    100,
    "Structured data parses cleanly and every rich-result type in use " +
      `(${[...new Set(validated)].sort().join(", ")}) declares its required and ` +
      "recommended properties.",
  );
}

// --- International ---------------------------------------------------------

/** A legal `hreflang` attribute value: a BCP-47 tag, or `x-default`. */
export function isValidHreflangValue(value: string): boolean {
  const tag = (value ?? "").trim();
  if (!tag) return false;
  if (tag.toLowerCase() === HREFLANG_DEFAULT_VALUE) return true;
  return BCP47_RE.test(tag) && !tag.toLowerCase().startsWith("x-");
}

/**
 * Comparison key for "is this the same page?" across annotations. Scheme and
 * fragment are dropped and the host is lowercased with `www.` folded away.
 */
export function normalizedUrlKey(url: string): string {
  const parts = urlSplit((url ?? "").trim());
  let host = parts.netloc.toLowerCase();
  if (host.startsWith("www.")) host = host.slice(4);
  const path = rstripSlashes(parts.path) || "/";
  return `${host}${path}` + (parts.query ? `?${parts.query}` : "");
}

/** (lang, href) pairs as captured, both non-empty strings. */
export function hreflangEntries(ev: PageEvidence): [string, string][] {
  const entries: [string, string][] = [];
  for (const item of ev.hreflang ?? []) {
    if (typeof item !== "object" || item === null) continue;
    const lang = item["lang"];
    const href = item["href"];
    if (
      typeof lang === "string" &&
      typeof href === "string" &&
      lang.trim() &&
      href.trim()
    ) {
      entries.push([lang.trim(), href.trim()]);
    }
  }
  return entries;
}

/**
 * Codes, absolute URLs, self-reference, canonical agreement, x-default.
 *
 * Rule order is the catalog row's and is deliberate: an invalid code breaks
 * the whole cluster for every page in it, so it is reported ahead of the
 * self-reference and canonical problems that break only this page's half.
 */
export function checkHreflangValidity(ev: PageEvidence): CheckOutcome {
  const entries = hreflangEntries(ev);
  if (entries.length === 0) {
    return outcome(
      "n_a",
      null,
      "This page declares no hreflang annotations, so there is no " +
        "language cluster to validate.",
    );
  }

  const badCodes = entries
    .filter(([lang]) => !isValidHreflangValue(lang))
    .map(([lang]) => lang);
  const relative = entries
    .filter(
      ([, href]) =>
        !href.toLowerCase().startsWith("http://") &&
        !href.toLowerCase().startsWith("https://"),
    )
    .map(([, href]) => href);
  if (badCodes.length || relative.length) {
    const problems: string[] = [];
    if (badCodes.length) {
      problems.push(
        `${badCodes.length} annotation(s) use a language code that is not ` +
          `a valid language(-script)(-region) tag: ${badCodes.slice(0, 5).join(", ")}`,
      );
    }
    if (relative.length) {
      problems.push(
        `${relative.length} annotation(s) point at a relative URL — hreflang ` +
          "must always be absolute",
      );
    }
    return outcome(
      "fail",
      30,
      problems.join("; ") +
        ". Search engines drop an entire hreflang cluster that contains an " +
        "annotation they cannot resolve.",
      badCodes.length + relative.length,
      {
        invalid_codes: badCodes.slice(0, STRUCTURED_DATA_EVIDENCE_LIMIT),
        relative_urls: sampleUrls(relative),
      },
    );
  }

  const selfKey = normalizedUrlKey(ev.url);
  const selfEntry =
    entries.find(([, href]) => normalizedUrlKey(href) === selfKey) ?? null;
  if (selfEntry === null) {
    return outcome(
      "fail",
      45,
      `This page's hreflang set names ${entries.length} language version(s) but ` +
        "never names ITSELF. A cluster without a self-reference is invalid, and " +
        "search engines ignore the whole set.",
      1,
      { declared: sampleUrls(entries.map(([, href]) => href)) },
    );
  }

  const canonical = ev.canonicalUrl;
  if (
    canonical &&
    (canonical.startsWith("http://") || canonical.startsWith("https://")) &&
    normalizedUrlKey(canonical) !== normalizedUrlKey(selfEntry[1])
  ) {
    return outcome(
      "fail",
      40,
      `The hreflang self-reference (${sliceCodePoints(selfEntry[1], 120)}) and the ` +
        `rel=canonical (${sliceCodePoints(canonical, 120)}) name DIFFERENT URLs — the page ` +
        "is annotating a URL it also says is not the canonical one, and " +
        "the two signals cancel out.",
      1,
      { self_href: selfEntry[1], canonical_url: canonical },
    );
  }

  if (
    !entries.some(([lang]) => lang.toLowerCase() === HREFLANG_DEFAULT_VALUE)
  ) {
    return outcome(
      "warn",
      80,
      `The hreflang set is valid (${entries.length} version(s), self-reference ` +
        "present) but declares no x-default — visitors whose language matches " +
        "none of the declared versions get no designated fallback page.",
      1,
    );
  }
  return outcome(
    "pass",
    100,
    `Valid hreflang set: ${entries.length} version(s), all codes and URLs well ` +
      "formed, self-reference present, x-default declared.",
  );
}

// --- Lab performance (PageSpeed Insights) ----------------------------------
//
// 🚨 These checks are PURE, like every other one here: they read
// `labPerformance` and nothing else. Collection is a separate step; this half
// only scores what landed.

/** Map `value` in [low, high] onto `band`, where LOWER value scores HIGHER. */
function linearBand(
  value: number,
  low: number,
  high: number,
  band: readonly [number, number],
): number {
  const span = high - low;
  const top = band[1];
  const bottom = band[0];
  if (span <= 0) return top;
  const fraction = Math.min(Math.max((value - low) / span, 0), 1);
  return clampScore(pythonRound(top - fraction * (top - bottom)));
}

function performanceStatus(score: number): CheckStatus {
  if (score >= PERFORMANCE_PASS_SCORE) return "pass";
  return score >= PERFORMANCE_WARN_SCORE ? "warn" : "fail";
}

/**
 * The shared "is there a usable measurement?" gate. Returns `[lab, null]` when
 * a check may score, or `[null, outcome]` with the `n_a` verdict + its
 * one-click fix when it may not.
 */
function labOrReason(
  ev: PageEvidence,
): [LabPerformance | null, CheckOutcome | null] {
  const lab = ev.labPerformance;
  if (lab === null || lab === undefined) {
    return [
      null,
      outcome(
        "n_a",
        null,
        "We haven't measured this page's real-world loading speed yet. It " +
          "needs a browser to load the page and time it, which a crawl cannot do.",
        0,
        null,
        COLLECT_PAGESPEED,
      ),
    ];
  }
  if (lab.observedAt) {
    const observed = Date.parse(lab.observedAt);
    if (!Number.isNaN(observed)) {
      const ageDays = Math.floor((Date.now() - observed) / 86_400_000);
      if (ageDays > LAB_PERFORMANCE_MAX_AGE_DAYS) {
        return [
          null,
          outcome(
            "n_a",
            null,
            `The last speed measurement of this page is ${ageDays} days old — ` +
              "too old to describe the page as it is today.",
            0,
            null,
            COLLECT_PAGESPEED,
          ),
        ];
      }
    }
  }
  return [lab, null];
}

/** Python `str.capitalize()` — first character upper, the rest lower. */
function pyCapitalize(text: string): string {
  return text.slice(0, 1).toUpperCase() + text.slice(1).toLowerCase();
}

/** "in a simulated phone test on <date>" — a lab number is an estimate. */
function labEstimatePhrase(lab: LabPerformance): string {
  const device = lab.strategy === "mobile" ? "phone" : lab.strategy;
  const when = lab.observedAt ? ` on ${lab.observedAt.slice(0, 10)}` : "";
  return `in a simulated ${device} test${when}`;
}

function fieldPhrase(fieldEntry: FieldMetric): string {
  const scope = fieldEntry.level === "page" ? "this page" : "this site's pages";
  return `real visitors to ${scope} (Google's 28-day field data)`;
}

function measuredOn(lab: LabPerformance): string {
  const where = lab.strategy === "mobile" ? "on a phone" : `on ${lab.strategy}`;
  const when = lab.observedAt ? ` on ${lab.observedAt.slice(0, 10)}` : "";
  return `${where}${when}`;
}

/** The number to grade: real-visitor field data first, lab estimate second. */
function cwvValue(
  lab: LabPerformance,
  fieldKey: string,
  labValue: number | null | undefined,
): [number | null, FieldMetric | null] {
  const entry = lab.fieldMetrics?.[fieldKey];
  if (entry !== null && entry !== undefined) {
    return [Number(entry.value), entry];
  }
  return [labValue ?? null, null];
}

export function checkCwvLcp(ev: PageEvidence): CheckOutcome {
  const [lab, blocked] = labOrReason(ev);
  if (blocked !== null) return blocked;
  if (lab === null) return blocked as never;
  const [lcp, fieldEntry] = cwvValue(lab, "lcp_ms", lab.lcpMs);
  if (lcp === null) {
    return outcome(
      "n_a",
      null,
      "The speed measurement for this page did not report when its main " +
        "content finished drawing.",
      0,
      null,
      COLLECT_PAGESPEED,
    );
  }
  const seconds = `${pyFixed(lcp / 1000, 1)}s`;
  let score: number;
  if (lcp <= LCP_GOOD_MS) {
    score = linearBand(lcp, 0, LCP_GOOD_MS, CWV_GOOD_BAND);
  } else if (lcp <= LCP_POOR_MS) {
    score = linearBand(lcp, LCP_GOOD_MS, LCP_POOR_MS, CWV_MID_BAND);
  } else {
    score = clampScore(
      pythonRound(CWV_POOR_CEILING - (lcp - LCP_POOR_MS) / LCP_POOR_MS_PER_POINT),
    );
  }
  const source = fieldEntry ? "field" : "lab";
  const evidence = { lcp_ms: lcp, strategy: lab.strategy, source };
  const who = fieldEntry ? fieldPhrase(fieldEntry) : labEstimatePhrase(lab);
  if (score >= PERFORMANCE_PASS_SCORE) {
    return outcome(
      "pass",
      score,
      (fieldEntry
        ? `For ${who}, the main content appears in ${seconds} (75th percentile)`
        : `${pyCapitalize(who)}, the main content appeared in ${seconds} (a lab estimate)`) +
        " — inside Google's 2.5 second target.",
      0,
      evidence,
    );
  }
  const lead = fieldEntry
    ? `For ${who}, the main content takes ${seconds} to appear (75th percentile).`
    : `${pyCapitalize(who)}, the main content took ${seconds} to appear. That is ` +
      "a lab estimate, not a measurement of your real visitors.";
  return outcome(
    performanceStatus(score),
    score,
    `${lead} Google's target is 2.5 seconds and it treats anything over 4 as ` +
      "poor; visitors leave before a slow page finishes, so this costs both " +
      "rankings and the visits you already earned.",
    1,
    evidence,
  );
}

/**
 * Responsiveness: real-visitor INP when Google has it, else lab TBT.
 *
 * INP is the Core Web Vital Google ranks on. TBT is a lab stand-in for it and
 * is NOT a ranking signal, so it is only ever described as an estimate.
 */
export function checkCwvInpTbt(ev: PageEvidence): CheckOutcome {
  const [lab, blocked] = labOrReason(ev);
  if (blocked !== null) return blocked;
  if (lab === null) return blocked as never;
  const inp = lab.fieldMetrics?.inp_ms;
  if (inp !== null && inp !== undefined) {
    const value = Number(inp.value);
    let score: number;
    if (value <= INP_GOOD_MS) {
      score = linearBand(value, 0, INP_GOOD_MS, CWV_GOOD_BAND);
    } else if (value <= INP_POOR_MS) {
      score = linearBand(value, INP_GOOD_MS, INP_POOR_MS, CWV_MID_BAND);
    } else {
      score = clampScore(
        pythonRound(CWV_POOR_CEILING - (value - INP_POOR_MS) / INP_POOR_MS_PER_POINT),
      );
    }
    const evidence = { inp_ms: value, strategy: lab.strategy, source: "field" };
    const who = fieldPhrase(inp);
    if (score >= PERFORMANCE_PASS_SCORE) {
      return outcome(
        "pass",
        score,
        `For ${who}, the page reacts to taps and clicks within ${pythonRound(value)}ms ` +
          "(INP, 75th percentile) — inside Google's 200ms target.",
        0,
        evidence,
      );
    }
    return outcome(
      performanceStatus(score),
      score,
      `For ${who}, the page takes ${pythonRound(value)}ms to react to taps and clicks ` +
        "(INP, 75th percentile; Google's target is 200ms, and INP is a " +
        "ranking signal). The usual cause is too much JavaScript running.",
      1,
      evidence,
    );
  }
  if (lab.tbtMs === null || lab.tbtMs === undefined) {
    return outcome(
      "n_a",
      null,
      "The speed measurement for this page did not report how long it " +
        "stayed unresponsive while loading.",
      0,
      null,
      COLLECT_PAGESPEED,
    );
  }
  const tbt = lab.tbtMs;
  let score: number;
  if (tbt <= TBT_GOOD_MS) {
    score = linearBand(tbt, 0, TBT_GOOD_MS, CWV_GOOD_BAND);
  } else if (tbt <= TBT_POOR_MS) {
    score = linearBand(tbt, TBT_GOOD_MS, TBT_POOR_MS, CWV_MID_BAND);
  } else {
    score = clampScore(
      pythonRound(CWV_POOR_CEILING - (tbt - TBT_POOR_MS) / TBT_POOR_MS_PER_POINT),
    );
  }
  const evidence = { tbt_ms: tbt, strategy: lab.strategy, source: "lab" };
  const when = labEstimatePhrase(lab);
  if (score >= PERFORMANCE_PASS_SCORE) {
    return outcome(
      "pass",
      score,
      `${pyCapitalize(when)}, this page ignored taps and clicks for only ` +
        `${pythonRound(tbt)}ms while loading (a lab estimate) — comfortably responsive.`,
      0,
      evidence,
    );
  }
  return outcome(
    performanceStatus(score),
    score,
    `${pyCapitalize(when)}, this page was busy running scripts for ${pythonRound(tbt)}ms ` +
      "while loading and could not react to taps or clicks during that time. " +
      "This is a lab estimate of responsiveness (Total Blocking Time), not a " +
      "measurement of your real visitors and not itself a ranking signal. The " +
      "usual cause is too much JavaScript running before the page is usable.",
    1,
    evidence,
  );
}

export function checkCwvCls(ev: PageEvidence): CheckOutcome {
  const [lab, blocked] = labOrReason(ev);
  if (blocked !== null) return blocked;
  if (lab === null) return blocked as never;
  const [cls, fieldEntry] = cwvValue(lab, "cls", lab.cls);
  if (cls === null) {
    return outcome(
      "n_a",
      null,
      "The speed measurement for this page did not report how much its " +
        "layout moved while loading.",
      0,
      null,
      COLLECT_PAGESPEED,
    );
  }
  let score: number;
  if (cls <= CLS_GOOD) {
    score = linearBand(cls, 0, CLS_GOOD, CWV_GOOD_BAND);
  } else if (cls <= CLS_POOR) {
    score = linearBand(cls, CLS_GOOD, CLS_POOR, CWV_MID_BAND);
  } else {
    score = clampScore(
      pythonRound(CWV_POOR_CEILING - (cls - CLS_POOR) * CLS_POOR_PENALTY_PER_UNIT),
    );
  }
  const evidence = {
    cls,
    strategy: lab.strategy,
    source: fieldEntry ? "field" : "lab",
  };
  const who = fieldEntry ? fieldPhrase(fieldEntry) : labEstimatePhrase(lab);
  if (score >= PERFORMANCE_PASS_SCORE) {
    const subject = fieldEntry ? `For ${who}` : pyCapitalize(who);
    return outcome(
      "pass",
      score,
      `${subject}, this page holds still as it loads (layout shift ` +
        `${pyFixed(cls, 3)}) — under Google's 0.1 limit.`,
      0,
      evidence,
    );
  }
  const subject = fieldEntry
    ? `For ${who}`
    : `${pyCapitalize(who)} (a lab estimate)`;
  return outcome(
    performanceStatus(score),
    score,
    `${subject}, content on this page jumps around while it loads (layout ` +
      `shift ${pyFixed(cls, 3)}; Google's limit is 0.1). That is the effect where ` +
      "someone goes to tap one thing and hits another because an image or " +
      "advert pushed the page down. It is usually fixed by giving images and " +
      "embeds a declared width and height.",
    1,
    evidence,
  );
}

export function checkAssetDelivery(ev: PageEvidence): CheckOutcome {
  const [lab, blocked] = labOrReason(ev);
  if (blocked !== null) return blocked;
  if (lab === null) return blocked as never;
  if (lab.deliverySavingsMs === null || lab.deliverySavingsMs === undefined) {
    return outcome(
      "n_a",
      null,
      "The stored speed measurement for this page predates the delivery " +
        "breakdown, so there is nothing to add up yet.",
      0,
      null,
      COLLECT_PAGESPEED,
    );
  }
  // Lighthouse's per-audit savings overlap (the same slow first byte feeds
  // several of them), so their SUM overstates what one fix would win. Grade
  // and headline the single largest measured saving; the rest are secondary.
  const offenders = Object.entries(lab.deliveryAudits ?? {})
    .filter(([, ms]) => ms > 0)
    .sort((left, right) => right[1] - left[1]);
  const savings = offenders.length ? offenders[0][1] : 0;
  let score: number;
  if (savings <= DELIVERY_SAVINGS_GOOD_MS) {
    score = linearBand(savings, 0, DELIVERY_SAVINGS_GOOD_MS, CWV_GOOD_BAND);
  } else if (savings <= DELIVERY_SAVINGS_POOR_MS) {
    score = linearBand(
      savings,
      DELIVERY_SAVINGS_GOOD_MS,
      DELIVERY_SAVINGS_POOR_MS,
      CWV_MID_BAND,
    );
  } else {
    score = Math.max(
      DELIVERY_POOR_FLOOR,
      clampScore(
        pythonRound(
          CWV_POOR_CEILING -
            (savings - DELIVERY_SAVINGS_POOR_MS) / DELIVERY_POOR_MS_PER_POINT,
        ),
      ),
    );
  }
  const evidence = {
    largest_saving_ms: savings,
    largest_saving_audit: offenders.length ? offenders[0][0] : null,
    audits: Object.fromEntries(offenders.slice(0, CHECK_EVIDENCE_SAMPLE_LIMIT)),
    strategy: lab.strategy,
  };
  if (score >= PERFORMANCE_PASS_SCORE) {
    return outcome(
      "pass",
      score,
      `The biggest delivery cost on this page is about ${pythonRound(savings)}ms ` +
        `(${measuredOn(lab)}) — nothing worth chasing.`,
      0,
      evidence,
    );
  }
  const [topName, topMs] = offenders[0];
  const topLabel = DELIVERY_AUDIT_LABELS[topName] ?? topName;
  const others = offenders
    .slice(1, 4)
    .map(([name]) => DELIVERY_AUDIT_LABELS[name] ?? name)
    .join(", ");
  const secondary = others
    ? ` Smaller, overlapping causes (their savings are not additive): ${others}.`
    : "";
  return outcome(
    performanceStatus(score),
    score,
    `The biggest delivery cost on this page is ${topLabel}: about ` +
      `${pyFixed(pythonRound(topMs) / 1000, 1)}s of its load (${measuredOn(lab)}).${secondary} ` +
      "This is a build-and-hosting fix — nothing about your content has to change.",
    offenders.length,
    evidence,
  );
}

const SECOND_LEVEL_LABELS: ReadonlySet<string> = new Set([
  "co",
  "com",
  "org",
  "net",
  "gov",
  "ac",
  "edu",
]);

/**
 * Registrable domain of a host (`cdn.example.co.uk` -> `example.co.uk`).
 * Heuristic, no public-suffix list: good enough to separate the page owner's
 * own hosts (incl. its CDN subdomain) from other companies' hosts.
 */
function siteKey(host: string): string {
  const labels = host
    .toLowerCase()
    .split(":")[0]
    .split(".")
    .filter((label) => label !== "");
  if (
    labels.length >= 3 &&
    labels[labels.length - 1].length === 2 &&
    SECOND_LEVEL_LABELS.has(labels[labels.length - 2])
  ) {
    return labels.slice(-3).join(".");
  }
  return labels.slice(-2).join(".");
}

export function checkCachingPolicy(ev: PageEvidence): CheckOutcome {
  const [lab, blocked] = labOrReason(ev);
  if (blocked !== null) return blocked;
  if (lab === null) return blocked as never;
  if (lab.cacheStaticBytes === null || lab.cacheStaticBytes === undefined) {
    return outcome(
      "n_a",
      null,
      "The stored speed measurement for this page predates the caching " +
        "breakdown, so its cache lifetimes are unknown.",
      0,
      null,
      COLLECT_PAGESPEED,
    );
  }
  const pageSite = siteKey(urlSplit(ev.url).netloc);
  const byHost = lab.cacheStaticBytesByHost ?? {};
  const hasByHost = Object.keys(byHost).length > 0;
  let staticBytes = hasByHost
    ? Object.entries(byHost)
        .filter(([host]) => siteKey(host) === pageSite)
        .reduce((total, [, bytes]) => total + bytes, 0)
    : lab.cacheStaticBytes;

  const firstParty = (resource: CacheShortTtlResource): boolean =>
    siteKey(urlSplit(String(resource?.url || "")).netloc) === pageSite;

  const allShort = (lab.cacheShortTtlResources ?? []).filter((resource) => {
    const lifetime = labNumber(resource?.cache_lifetime_ms);
    return lifetime !== null && lifetime < CACHE_WELL_CACHED_MIN_MS;
  });
  const shortTtl = allShort.filter((resource) => firstParty(resource));
  const thirdParty = allShort.filter((resource) => !firstParty(resource));
  const thirdPartyHosts = [
    ...new Set(
      thirdParty.map((resource) => urlSplit(String(resource?.url || "")).netloc),
    ),
  ]
    .filter((host) => host !== "")
    .sort();
  if (!hasByHost) {
    // Without a per-host breakdown the denominator still contains third
    // parties; remove the ones we can see so they never count against it.
    staticBytes = Math.max(
      0,
      staticBytes -
        thirdParty.reduce(
          (total, resource) => total + (labNumber(resource?.total_bytes) ?? 0),
          0,
        ),
    );
  }
  const evidence: Record<string, unknown> = {
    static_bytes: staticBytes,
    strategy: lab.strategy,
    third_party_not_yours: sampleUrls(
      thirdParty.map((resource) => String(resource?.url || "")),
    ),
    third_party_hosts: thirdPartyHosts.slice(0, CHECK_EVIDENCE_SAMPLE_LIMIT),
  };
  const thirdNote = thirdParty.length
    ? ` ${thirdParty.length} more file(s) from other companies ` +
      `(${thirdPartyHosts.slice(0, 3).join(", ")}) also expire early, but they are ` +
      "not yours to change and are not counted."
    : "";
  if (staticBytes < CACHE_NEGLIGIBLE_STATIC_BYTES) {
    return outcome(
      "pass",
      100,
      "This page loads almost no images, styling or code files of its own, " +
        "so how long they are cached makes no practical difference." +
        thirdNote,
      0,
      evidence,
    );
  }
  const poorlyCachedBytes = Math.min(
    staticBytes,
    shortTtl.reduce(
      (total, resource) => total + (labNumber(resource?.total_bytes) ?? 0),
      0,
    ),
  );
  const wellCachedBytes = Math.max(0, staticBytes - poorlyCachedBytes);
  const score = clampScore(pythonRound((100 * wellCachedBytes) / staticBytes));
  evidence.well_cached_bytes = wellCachedBytes;
  evidence.short_ttl_urls = sampleUrls(
    shortTtl.map((resource) => String(resource?.url || "")),
  );
  evidence.list_truncated = lab.cacheListTruncated ?? false;
  if (score >= PERFORMANCE_PASS_SCORE) {
    return outcome(
      "pass",
      score,
      "Visitors' browsers keep this page's own images, styling and code for " +
        "a month or more, so returning visits reuse them instead of " +
        "re-downloading them." +
        thirdNote,
      0,
      evidence,
    );
  }
  const share = pythonRound((100 * poorlyCachedBytes) / staticBytes);
  const truncated = lab.cacheListTruncated === true;
  const count = truncated ? `at least ${shortTtl.length}` : String(shortTtl.length);
  const shareText = truncated ? `At least ${share}%` : `${share}%`;
  return outcome(
    performanceStatus(score),
    score,
    `${shareText} of this page's own images, styling and code are told to ` +
      `expire in under a month (${count} files, ${measuredOn(lab)}), so people ` +
      "who come back download them all over again — a slower repeat visit for " +
      "no benefit. It is a one-line hosting setting, not a content change." +
      thirdNote,
    shortTtl.length,
    evidence,
  );
}

/** Python `_lab_number` — a real number, or null (booleans are not numbers). */
function labNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

// ---------------------------------------------------------------------------
// JS app shells and dead ends — mirror of seo_audit.page_is_js_shell,
// check_content_needs_rendering, check_dead_end_page.
// ---------------------------------------------------------------------------

/**
 * KNOB MIRROR: `knowledge.scraper.audit.js_shell_word_limit` = 20 (Python
 * `app_shell.JS_SHELL_WORD_LIMIT_DEFAULT`). Fewer visible words than this, plus the
 * other shell signals, is an unrendered app frame.
 */
export const JS_SHELL_WORD_LIMIT = 20;

/** The `is_js_shell` page fact; null when a signal was never captured. */
export function pageIsJsShell(
  ev: PageEvidence,
  wordLimit: number = JS_SHELL_WORD_LIMIT,
): boolean | null {
  const words =
    ev.appShellWords !== null && ev.appShellWords !== undefined
      ? ev.appShellWords
      : ev.wordCount;
  const headingCount =
    ev.headings === null || ev.headings === undefined ? null : ev.headings.length;
  const signals = [
    ev.appRoot,
    ev.executableScript,
    words,
    headingCount,
    ev.linkCount,
    ev.imageCount,
  ];
  if (signals.some((signal) => signal === null || signal === undefined)) {
    return null;
  }
  return Boolean(
    ev.appRoot &&
      ev.executableScript &&
      (words ?? 0) < wordLimit &&
      headingCount === 0 &&
      ev.linkCount === 0 &&
      ev.imageCount === 0,
  );
}

export const JS_SHELL_NOT_APPLICABLE_REASON =
  "This page draws its content with JavaScript after it loads, and this crawl read it " +
  "without running that JavaScript, so there is no content to judge here. See the " +
  '"content needs rendering" finding for how to crawl it rendered.';

export function jsShellNotApplicable(ev: PageEvidence): CheckOutcome | null {
  if (pageIsJsShell(ev)) {
    return outcome("n_a", null, JS_SHELL_NOT_APPLICABLE_REASON);
  }
  return null;
}

/** Wrap a CONTENT check so an app shell answers n_a instead of a false finding. */
function unlessJsShell(
  check: (ev: PageEvidence) => CheckOutcome,
): (ev: PageEvidence) => CheckOutcome {
  return (ev: PageEvidence) => jsShellNotApplicable(ev) ?? check(ev);
}

function isIndexable2xx(ev: PageEvidence): boolean {
  const status = ev.httpStatus;
  return (
    status !== null &&
    status !== undefined &&
    status >= 200 &&
    status < 300 &&
    ev.noindex === false &&
    ev.canonicalMatches !== false
  );
}

function shellWords(ev: PageEvidence): number {
  const words =
    ev.appShellWords !== null && ev.appShellWords !== undefined
      ? ev.appShellWords
      : ev.wordCount;
  return words ?? 0;
}

export function checkContentNeedsRendering(ev: PageEvidence): CheckOutcome {
  const status = ev.httpStatus;
  if (status !== null && status !== undefined && !(status >= 200 && status < 300)) {
    return outcome(
      "n_a",
      null,
      `This URL answers with HTTP ${status}, so it has no page content to render.`,
    );
  }
  const shell = pageIsJsShell(ev);
  if (shell === null) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded whether this page is drawn by JavaScript yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  if (!shell) {
    return outcome("pass", 100, "The page's content is in the HTML we fetched.");
  }
  return outcome(
    "fail",
    20,
    `The HTML we fetched is an empty app frame (${shellWords(ev)} words, no headings, ` +
      "links or images) that JavaScript fills in after it loads. This crawl read it without " +
      "running JavaScript, so its content was not audited. Turn on rendered crawling: in " +
      'this site\'s settings set Render mode to "Browser always", then crawl again.',
    1,
  );
}

export function checkDeadEndPage(ev: PageEvidence): CheckOutcome {
  const status = ev.httpStatus;
  if (status !== null && status !== undefined && !(status >= 200 && status < 300)) {
    return outcome(
      "n_a",
      null,
      `This URL answers with HTTP ${status}, so it is not a page people land on.`,
    );
  }
  if (
    ev.internalLinkCount === null ||
    ev.internalLinkCount === undefined ||
    ev.noindex === null ||
    ev.noindex === undefined ||
    status === null ||
    status === undefined
  ) {
    return outcome(
      "n_a",
      null,
      "We haven't recorded this page's links yet.",
      0,
      null,
      RECAPTURE_PAGE,
    );
  }
  const shell = jsShellNotApplicable(ev);
  if (shell) return shell;
  if (!isIndexable2xx(ev)) {
    return outcome(
      "n_a",
      null,
      "This page is noindexed or names another page as its canonical, so it is not " +
        "meant to be a page people arrive on from search.",
    );
  }
  if (ev.internalLinkCount > 0) {
    return outcome(
      "pass",
      100,
      `${ev.internalLinkCount} internal link(s) lead on from this page.`,
    );
  }
  return outcome(
    "warn",
    70,
    "This page has no links to any other page on the site — a visitor who lands here " +
      "from search has nowhere to go next, and crawlers stop here.",
    1,
  );
}

/**
 * The canonical registry. A per-page SEO check exists HERE (and in its Python
 * twin) or it does not exist — no surface may re-derive one of these verdicts
 * from raw evidence in a component.
 */
export const PAGE_CHECKS: Record<
  string,
  (ev: PageEvidence) => CheckOutcome
> = {
  url_design_quality: checkUrlDesignQuality,
  title_presence: checkTitlePresence,
  title_length: checkTitleLength,
  meta_description_presence: checkMetaDescriptionPresence,
  meta_description_length: checkMetaDescriptionLength,
  h1_presence: unlessJsShell(checkH1Presence),
  heading_hierarchy: unlessJsShell(checkHeadingHierarchy),
  thin_content: unlessJsShell(checkThinContent),
  content_depth: unlessJsShell(checkContentDepth),
  text_html_ratio: unlessJsShell(checkTextHtmlRatio),
  image_alt_presence: unlessJsShell(checkImageAltPresence),
  image_dimension_attrs: checkImageDimensionAttrs,
  image_lazy_loading: checkImageLazyLoading,
  image_modern_format: checkImageModernFormat,
  image_oversized: checkImageOversized,
  broken_images: checkBrokenImages,
  viewport_meta: checkViewportMeta,
  html_lang_validity: checkHtmlLangValidity,
  og_image_validity: checkOgImageValidity,
  social_meta_completeness: checkSocialMetaCompleteness,
  meta_robots_conflicts: checkMetaRobotsConflicts,
  canonical_presence: checkCanonicalPresence,
  canonical_conflicts: checkCanonicalConflicts,
  meta_refresh_redirect: checkMetaRefreshRedirect,
  broken_page_4xx: checkBrokenPage4xx,
  server_error_5xx: checkServerError5xx,
  redirect_chain: checkRedirectChain,
  redirect_loop: checkRedirectLoop,
  temporary_redirect_usage: checkTemporaryRedirectUsage,
  soft_404_detection: unlessJsShell(checkSoft404Detection),
  content_needs_rendering: checkContentNeedsRendering,
  dead_end_page: checkDeadEndPage,
  pagination_markup: checkPaginationMarkup,
  mixed_content: checkMixedContent,
  https_enforcement: checkHttpsEnforcement,
  page_weight: checkPageWeight,
  ttfb_server_response: checkTtfbServerResponse,
  structured_data_validity: checkStructuredDataValidity,
  hreflang_validity: checkHreflangValidity,
  cwv_lcp: checkCwvLcp,
  cwv_inp_tbt: checkCwvInpTbt,
  cwv_cls: checkCwvCls,
  asset_delivery: checkAssetDelivery,
  caching_policy: checkCachingPolicy,
};

/** Every per-page check, keyed by check name. */
export function runPageChecks(ev: PageEvidence): Record<string, CheckOutcome> {
  const results: Record<string, CheckOutcome> = {};
  for (const [key, check] of Object.entries(PAGE_CHECKS)) {
    results[key] = check(ev);
  }
  return results;
}
