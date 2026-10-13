/**
 * Search — the shared types for a kind-shaped web search (`/search` and the
 * Search Lab at `/scraper/search`).
 *
 * The wire shape is aidream's `SearchKindsResultEvent`
 * (`aidream/services/search_kinds/service.py`): a `web_search_results` kind
 * instance plus the adapter's translation report and the request diagnostics.
 * Nothing here re-declares the kind itself — the kind's shape is owned by the
 * registry and rendered by its registered components; this surface only
 * carries it.
 */

/** Engines the search door accepts. The public `/search` page sends only Brave. */
export type SearchProvider = "brave" | "google";

/** Result types (one provider call each). */
export type SearchVertical = "web" | "news" | "images" | "videos" | "places";
export type SearchSafeSearch = "off" | "moderate" | "strict";
export type SearchTimeRange = "day" | "week" | "month" | "year";
export type SearchDevice = "desktop" | "mobile";

/**
 * Optional request knobs. Every field omitted = the server's default (today's
 * behaviour). Names are camelCase here; `runKindSearch` writes snake_case.
 */
export interface SearchRequestOptions {
  vertical?: SearchVertical;
  country?: string;
  language?: string;
  safeSearch?: SearchSafeSearch;
  timeRange?: SearchTimeRange | null;
  page?: number;
  location?: string | null;
  device?: SearchDevice;
  /** Brave web only — adds the AI answer. */
  aiAnswer?: boolean;
  /** Ask the server to echo the provider's raw payload. */
  includeRaw?: boolean;
}

/** Provider keys the translation adapter did not claim, or dropped, per section. */
export interface SearchTranslationSection {
  section: string;
  keys: string[];
}

/** One provider value the adapter dropped, with why. */
export interface SearchTranslationDrop {
  path: string;
  reason: string;
  kindOf: string | null;
  size: number | null;
  preview: string | null;
}

export interface SearchTranslationReport {
  provider: string;
  unknownSections: SearchTranslationSection[];
  /** Values the adapter saw and deliberately dropped. */
  dropped: SearchTranslationDrop[];
  /** The report exactly as the server sent it (inspector view). */
  raw: Record<string, unknown>;
}

export interface SearchOutcome {
  /** The `web_search_results` kind instance, exactly as the server emitted it. */
  result: Record<string, unknown>;
  translation: SearchTranslationReport | null;
  /** The provider's raw payload — only when `includeRaw` was asked for. */
  raw: Record<string, unknown> | null;
  /** Options this engine/result type could not honour, as plain sentences. */
  ignoredOptions: string[];
  /** The provider wire params actually sent (secrets redacted by the server). */
  request: Record<string, unknown> | null;
  elapsedMs: number | null;
}

export type SearchPhase = "idle" | "searching" | "done" | "error";
