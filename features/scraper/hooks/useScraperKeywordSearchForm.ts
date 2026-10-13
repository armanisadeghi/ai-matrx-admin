"use client";

/**
 * useScraperKeywordSearchForm — the keyword web search behind `/scraper/search`
 * (the Search Lab) and the floating Web Scraper's search mode.
 *
 * It runs on THE one client search path, `runKindSearch`
 * (`POST /search-kinds/search`), so both mounts get the `web_search_results`
 * kind the server's translation adapter produced, plus its diagnostics
 * (request sent, raw payload, ignored options, elapsed time).
 *
 * Engines: "brave", "google", or "compare" (both in parallel, one outcome per
 * engine). A search runs only when `handleSearch` is called — never on a
 * keystroke — because a Google search spends a shared monthly allowance.
 *
 * `flatResults` stays the floating workspace's and the agent context's hit
 * list (`SearchResultItem`): it is derived from the kind across
 * results/news/videos/images/places, every engine in order.
 *
 * Search & Scrape still uses the scraper's own `/scraper/search` path via
 * `useScraperApi` — this hook does not.
 */

import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/useBackendApi";
import { runKindSearch } from "@/features/search/service";
import { SEARCH_ENGINE_LABEL } from "@/features/search/types";
import type {
  SearchOutcome,
  SearchPhase,
  SearchProvider,
  SearchRequestOptions,
  SearchVertical,
} from "@/features/search/types";
import type { SearchResultItem } from "@/features/scraper/types/scraper-api";
import {
  RESULT_LIMIT_DEFAULT,
  RESULT_LIMIT_MAX,
  RESULT_LIMIT_MIN,
  SEARCH_LAB_ENGINE_VALUES,
  SEARCH_LAB_VERTICAL_VALUES,
} from "@/features/scraper/scrape-command";

export type KeywordSearchEngine = SearchProvider | "compare";

export const KEYWORD_SEARCH_ENGINES: readonly KeywordSearchEngine[] =
  SEARCH_LAB_ENGINE_VALUES;
export const KEYWORD_SEARCH_VERTICALS: readonly SearchVertical[] =
  SEARCH_LAB_VERTICAL_VALUES;

/** The knobs beside the query (everything but vertical, count and raw capture). */
export type KeywordSearchOptions = Required<
  Omit<SearchRequestOptions, "vertical" | "includeRaw">
>;

export const DEFAULT_KEYWORD_SEARCH_OPTIONS: KeywordSearchOptions = {
  country: "us",
  language: "en",
  // The server's default is "off"; the UI sends it explicitly every time.
  safeSearch: "off",
  timeRange: null,
  page: 1,
  location: "",
  device: "desktop",
  aiAnswer: false,
};

/** One engine's run. */
export interface KeywordEngineRun {
  provider: SearchProvider;
  phase: SearchPhase;
  outcome: SearchOutcome | null;
  error: string | null;
  /** Whether this run asked for the raw provider payload. */
  includedRaw: boolean;
}

/** Everything that defines one search — what the URL and a re-run carry. */
export interface KeywordSearchRequest {
  query: string;
  engine: KeywordSearchEngine;
  vertical: SearchVertical;
  count: number;
  options: KeywordSearchOptions;
}

/** Failure info for the error disclosure — safe to JSON.stringify. */
export interface KeywordSearchDiagnostics {
  hook: "useScraperKeywordSearchForm";
  endpoint: "/search-kinds/search";
  request: Omit<KeywordSearchRequest, "options"> & {
    options: KeywordSearchOptions;
  };
  failures: { provider: SearchProvider; message: string }[];
  at: string;
}

export interface UseScraperKeywordSearchFormInit {
  keywords?: string;
  maxResults?: number;
  engine?: KeywordSearchEngine;
  vertical?: SearchVertical;
  options?: Partial<KeywordSearchOptions>;
  /** Called with the exact request each time a search starts (URL sync). */
  onSearch?: (request: KeywordSearchRequest) => void;
}

export interface UseScraperKeywordSearchFormReturn {
  keywords: string;
  setKeywords: (v: string) => void;
  maxResults: string;
  setMaxResults: (v: string) => void;
  engine: KeywordSearchEngine;
  setEngine: (engine: KeywordSearchEngine) => void;
  vertical: SearchVertical;
  setVertical: (vertical: SearchVertical) => void;
  options: KeywordSearchOptions;
  setOption: <K extends keyof KeywordSearchOptions>(
    key: K,
    value: KeywordSearchOptions[K],
  ) => void;
  resetOptions: () => void;
  /** How many options differ from their defaults. */
  changedOptionCount: number;
  /** Ask for the provider's raw payload on the next search (inspector). */
  includeRaw: boolean;
  setIncludeRaw: (v: boolean) => void;
  /** One run per engine searched, in engine order. */
  runs: KeywordEngineRun[];
  /** The request the current `runs` answer (null before the first search). */
  lastRequest: KeywordSearchRequest | null;
  /** True when the inputs no longer match `lastRequest`. */
  isStale: boolean;
  flatResults: SearchResultItem[];
  selectedHitIndex: number | null;
  setSelectedHitIndex: (i: number | null) => void;
  /** Run a search. `overrides` replace inputs for this run (and are kept). */
  handleSearch: (overrides?: Partial<KeywordSearchRequest>) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleClear: () => void;
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  errorDiagnostics: KeywordSearchDiagnostics | null;
  statusMessage: string | null;
  reset: () => void;
  /** Clear results, selection, and every input (floating workspace full reset). */
  resetAll: () => void;
}


function enginesFor(engine: KeywordSearchEngine): SearchProvider[] {
  return engine === "compare" ? ["brave", "google"] : [engine];
}

function clampCount(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return RESULT_LIMIT_DEFAULT;
  return Math.min(RESULT_LIMIT_MAX, Math.max(RESULT_LIMIT_MIN, n));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** The kind's items, flattened to the workspace/agent hit shape. */
export function kindToSearchItems(
  query: string,
  result: Record<string, unknown>,
): SearchResultItem[] {
  const out: SearchResultItem[] = [];
  const push = (
    list: unknown,
    read: (r: Record<string, unknown>) => SearchResultItem,
  ) => {
    if (!Array.isArray(list)) return;
    for (const item of list) if (isRecord(item)) out.push(read(item));
  };
  const source = str(result.source);
  const base = (r: Record<string, unknown>, type: string): SearchResultItem => ({
    keyword: query,
    type,
    source: str(r.source) ?? source,
    rank: typeof r.position === "number" ? r.position : undefined,
    age: str(r.age_text) ?? str(r.published_at),
    thumbnail: str(r.thumbnail) ?? null,
  });
  push(result.results, (r) => ({
    ...base(r, "web"),
    title: str(r.title),
    url: str(r.url),
    description: str(r.snippet),
  }));
  push(result.news, (r) => ({
    ...base(r, "news"),
    title: str(r.title),
    url: str(r.url),
    description: str(r.snippet),
  }));
  push(result.videos, (r) => ({
    ...base(r, "video"),
    title: str(r.title),
    url: str(r.url),
    description: str(r.snippet) ?? str(r.description),
  }));
  push(result.images, (r) => ({
    ...base(r, "image"),
    title: str(r.title),
    url: str(r.page_url) ?? str(r.image_url),
    description: str(r.site_name),
    thumbnail: str(r.thumbnail) ?? str(r.image_url) ?? null,
  }));
  push(result.places, (r) => ({
    ...base(r, "place"),
    title: str(r.name),
    url: str(r.website_url),
    description:
      (isRecord(r.address) ? str(r.address.display) : undefined) ??
      str(r.description),
  }));
  return out;
}

export function countChangedOptions(options: KeywordSearchOptions): number {
  return (Object.keys(DEFAULT_KEYWORD_SEARCH_OPTIONS) as (keyof KeywordSearchOptions)[]).filter(
    (key) => {
      const value = options[key];
      const def = DEFAULT_KEYWORD_SEARCH_OPTIONS[key];
      if (key === "location") return String(value ?? "").trim() !== "";
      return value !== def;
    },
  ).length;
}

function sameRequest(a: KeywordSearchRequest, b: KeywordSearchRequest): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useScraperKeywordSearchForm(
  init: UseScraperKeywordSearchFormInit = {},
): UseScraperKeywordSearchFormReturn {
  const { post } = useBackendApi();
  const [keywords, setKeywords] = useState(init.keywords ?? "");
  const [maxResults, setMaxResults] = useState(
    String(init.maxResults ?? RESULT_LIMIT_DEFAULT),
  );
  const [engine, setEngine] = useState<KeywordSearchEngine>(init.engine ?? "brave");
  const [vertical, setVertical] = useState<SearchVertical>(init.vertical ?? "web");
  const [options, setOptions] = useState<KeywordSearchOptions>({
    ...DEFAULT_KEYWORD_SEARCH_OPTIONS,
    ...init.options,
  });
  const [includeRaw, setIncludeRaw] = useState(false);
  const [runs, setRuns] = useState<KeywordEngineRun[]>([]);
  const [lastRequest, setLastRequest] = useState<KeywordSearchRequest | null>(null);
  const [selectedHitIndex, setSelectedHitIndex] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<KeywordSearchDiagnostics | null>(null);
  const controllers = useRef<AbortController[]>([]);

  const current: KeywordSearchRequest = {
    query: keywords.trim(),
    engine,
    vertical,
    count: clampCount(maxResults),
    options,
  };

  const abortAll = () => {
    for (const c of controllers.current) c.abort();
    controllers.current = [];
  };

  const reset = () => {
    abortAll();
    setRuns([]);
    setLastRequest(null);
    setDiagnostics(null);
  };

  const handleSearch = async (overrides?: Partial<KeywordSearchRequest>) => {
    const request: KeywordSearchRequest = { ...current, ...overrides };
    request.query = request.query.trim();
    if (!request.query) return;

    // Overrides become the inputs, so the form shows what actually ran.
    if (overrides?.query !== undefined) setKeywords(overrides.query);
    if (overrides?.engine) setEngine(overrides.engine);
    if (overrides?.vertical) setVertical(overrides.vertical);
    if (overrides?.count !== undefined) setMaxResults(String(overrides.count));
    if (overrides?.options) setOptions(overrides.options);

    abortAll();
    setSelectedHitIndex(null);
    setDiagnostics(null);
    setLastRequest(request);
    init.onSearch?.(request);

    const providers = enginesFor(request.engine);
    setRuns(
      providers.map((provider) => ({
        provider,
        phase: "searching",
        outcome: null,
        error: null,
        includedRaw: includeRaw,
      })),
    );

    const patchRun = (provider: SearchProvider, patch: Partial<KeywordEngineRun>) =>
      setRuns((prev) =>
        prev.map((run) => (run.provider === provider ? { ...run, ...patch } : run)),
      );

    const requestOptions: SearchRequestOptions = {
      ...request.options,
      vertical: request.vertical,
      includeRaw,
    };

    const failures: { provider: SearchProvider; message: string }[] = [];
    let anyHits = false;

    await Promise.all(
      providers.map(async (provider) => {
        const controller = new AbortController();
        controllers.current.push(controller);
        try {
          await runKindSearch({
            post,
            query: request.query,
            provider,
            count: request.count,
            options: requestOptions,
            signal: controller.signal,
            onOutcome: (outcome) => {
              if (controller.signal.aborted) return;
              if (kindToSearchItems(request.query, outcome.result).length > 0)
                anyHits = true;
              patchRun(provider, { outcome });
            },
          });
          if (!controller.signal.aborted) patchRun(provider, { phase: "done" });
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          const message =
            err instanceof Error && err.message
              ? err.message
              : "The search failed. Try again in a moment.";
          failures.push({ provider, message });
          patchRun(provider, { phase: "error", error: message });
        }
      }),
    );

    if (failures.length > 0) {
      setDiagnostics({
        hook: "useScraperKeywordSearchForm",
        endpoint: "/search-kinds/search",
        request,
        failures,
        at: new Date().toISOString(),
      });
    }
    if (anyHits) setSelectedHitIndex(0);
  };

  const isLoading = runs.some((run) => run.phase === "searching");
  const failed = runs.filter((run) => run.phase === "error");
  const hasError = failed.length > 0;
  const error = hasError
    ? failed
        .map((run) =>
          runs.length > 1
            ? `${SEARCH_ENGINE_LABEL[run.provider]}: ${run.error}`
            : (run.error ?? ""),
        )
        .join(" ")
    : null;

  // Never names an engine: the engine switch and each column header do.
  const statusMessage = isLoading ? "Searching…" : null;

  const flatResults: SearchResultItem[] = runs.flatMap((run) =>
    run.outcome
      ? kindToSearchItems(lastRequest?.query ?? "", run.outcome.result)
      : [],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) void handleSearch();
  };

  const handleClear = () => {
    reset();
    setSelectedHitIndex(null);
  };

  const resetAll = () => {
    reset();
    setKeywords("");
    setMaxResults(String(RESULT_LIMIT_DEFAULT));
    setEngine("brave");
    setVertical("web");
    setOptions(DEFAULT_KEYWORD_SEARCH_OPTIONS);
    setSelectedHitIndex(null);
  };

  return {
    keywords,
    setKeywords,
    maxResults,
    setMaxResults,
    engine,
    setEngine,
    vertical,
    setVertical,
    options,
    setOption: (key, value) => setOptions((prev) => ({ ...prev, [key]: value })),
    resetOptions: () => setOptions(DEFAULT_KEYWORD_SEARCH_OPTIONS),
    changedOptionCount: countChangedOptions(options),
    includeRaw,
    setIncludeRaw,
    runs,
    lastRequest,
    isStale: lastRequest !== null && !sameRequest(lastRequest, current),
    flatResults,
    selectedHitIndex,
    setSelectedHitIndex,
    handleSearch,
    handleKeyDown,
    handleClear,
    isLoading,
    hasError,
    error,
    errorDiagnostics: diagnostics,
    statusMessage,
    reset,
    resetAll,
  };
}
