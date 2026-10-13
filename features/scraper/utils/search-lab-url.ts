/**
 * The Search Lab's URL contract (`/scraper/search?…`): the query, engine,
 * result type and every NON-DEFAULT option live in the query string, so a
 * test link reproduces exactly what its sender saw. Defaults are omitted to
 * keep links short.
 *
 *   q        query                    engine  brave | google | compare
 *   type     web|news|images|videos|places
 *   n        result count             country, lang  2-letter codes
 *   safe     off|moderate|strict (default off)      time    day|week|month|year
 *   page     1..10                    loc     free-text location
 *   device   desktop|mobile           ai      1 = Brave AI answer
 */

import type {
  SearchDevice,
  SearchSafeSearch,
  SearchTimeRange,
  SearchVertical,
} from "@/features/search/types";
import {
  DEFAULT_KEYWORD_SEARCH_OPTIONS,
  KEYWORD_SEARCH_ENGINES,
  KEYWORD_SEARCH_VERTICALS,
  type KeywordSearchEngine,
  type KeywordSearchOptions,
} from "@/features/scraper/hooks/useScraperKeywordSearchForm";
import {
  RESULT_LIMIT_DEFAULT,
  RESULT_LIMIT_MAX,
  RESULT_LIMIT_MIN,
} from "@/features/scraper/scrape-command";

export interface SearchLabUrlState {
  query: string;
  engine: KeywordSearchEngine;
  vertical: SearchVertical;
  count: number;
  options: KeywordSearchOptions;
}

const SAFE: readonly SearchSafeSearch[] = ["off", "moderate", "strict"];
const TIME: readonly SearchTimeRange[] = ["day", "week", "month", "year"];
const DEVICE: readonly SearchDevice[] = ["desktop", "mobile"];
export const SEARCH_LAB_PAGE_MAX = 10;

function pick<T extends string>(list: readonly T[], raw: string | null): T | undefined {
  return list.find((v) => v === raw);
}

function int(raw: string | null, min: number, max: number): number | undefined {
  if (raw === null) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

function code(raw: string | null): string | undefined {
  return raw && /^[a-zA-Z]{2}$/.test(raw) ? raw.toLowerCase() : undefined;
}

export function parseSearchLabParams(params: URLSearchParams): SearchLabUrlState {
  const d = DEFAULT_KEYWORD_SEARCH_OPTIONS;
  return {
    query: params.get("q")?.trim() ?? "",
    engine: pick(KEYWORD_SEARCH_ENGINES, params.get("engine")) ?? "brave",
    vertical: pick(KEYWORD_SEARCH_VERTICALS, params.get("type")) ?? "web",
    count:
      int(params.get("n"), RESULT_LIMIT_MIN, RESULT_LIMIT_MAX) ?? RESULT_LIMIT_DEFAULT,
    options: {
      country: code(params.get("country")) ?? d.country,
      language: code(params.get("lang")) ?? d.language,
      safeSearch: pick(SAFE, params.get("safe")) ?? d.safeSearch,
      timeRange: pick(TIME, params.get("time")) ?? null,
      page: int(params.get("page"), 1, SEARCH_LAB_PAGE_MAX) ?? d.page,
      location: params.get("loc")?.trim() ?? "",
      device: pick(DEVICE, params.get("device")) ?? d.device,
      aiAnswer: params.get("ai") === "1",
    },
  };
}

export function buildSearchLabQuery(state: SearchLabUrlState): string {
  const d = DEFAULT_KEYWORD_SEARCH_OPTIONS;
  const o = state.options;
  const p = new URLSearchParams();
  if (state.query.trim()) p.set("q", state.query.trim());
  if (state.engine !== "brave") p.set("engine", state.engine);
  if (state.vertical !== "web") p.set("type", state.vertical);
  if (state.count !== RESULT_LIMIT_DEFAULT) p.set("n", String(state.count));
  if (o.country !== d.country) p.set("country", o.country);
  if (o.language !== d.language) p.set("lang", o.language);
  if (o.safeSearch !== d.safeSearch) p.set("safe", o.safeSearch);
  if (o.timeRange) p.set("time", o.timeRange);
  if (o.page !== d.page) p.set("page", String(o.page));
  if (o.location?.trim()) p.set("loc", o.location.trim());
  if (o.device !== d.device) p.set("device", o.device);
  if (o.aiAnswer) p.set("ai", "1");
  return p.toString();
}
