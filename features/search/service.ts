/**
 * Search service — the ONE client path to a kind-shaped web search.
 *
 * Calls aidream's `POST /search-kinds/search` (the same endpoint the Stage B
 * demo proved) and returns the `web_search_results` kind instance the
 * translation adapter produced. There is no second search path on this
 * surface: provider keys live on the server, and the client never learns one.
 *
 * The endpoint streams NDJSON and emits exactly one `search_kinds_result`
 * event before `end`; this reader takes the last one it sees so a future
 * incremental server (section-by-section) needs no client rewrite — the
 * caller re-renders on every `onOutcome`.
 */

import { consumeStream } from "@/lib/api/stream-parser";
import type {
  SearchOutcome,
  SearchProvider,
  SearchRequestOptions,
  SearchTranslationDrop,
  SearchTranslationReport,
  SearchTranslationSection,
} from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** `[{section, keys[]}]` → sections; anything else is skipped. */
function readSections(v: unknown): SearchTranslationSection[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((u): SearchTranslationSection[] => {
    if (isRecord(u) && typeof u.section === "string") {
      return [
        {
          section: u.section,
          keys: Array.isArray(u.keys) ? u.keys.map(String) : [],
        },
      ];
    }
    return [];
  });
}

function readDropped(v: unknown): SearchTranslationDrop[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((d): SearchTranslationDrop[] =>
    isRecord(d)
      ? [
          {
            path: typeof d.path === "string" ? d.path : String(d.section ?? ""),
            reason: typeof d.reason === "string" ? d.reason : "",
            kindOf: typeof d.kind_of === "string" ? d.kind_of : null,
            size: typeof d.size === "number" ? d.size : null,
            preview:
              typeof d.preview === "string"
                ? d.preview
                : d.preview == null
                  ? null
                  : JSON.stringify(d.preview),
          },
        ]
      : [],
  );
}

function readTranslation(v: unknown): SearchTranslationReport | null {
  if (!isRecord(v) || typeof v.provider !== "string") return null;
  return {
    provider: v.provider,
    unknownSections: readSections(v.unknown),
    dropped: readDropped(v.dropped),
    raw: v,
  };
}

/** camelCase options → the server's snake_case body. Unset fields are omitted. */
export function optionsBody(options: SearchRequestOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.vertical) body.vertical = options.vertical;
  if (options.country) body.country = options.country;
  if (options.language) body.language = options.language;
  if (options.safeSearch) body.safe_search = options.safeSearch;
  if (options.timeRange) body.time_range = options.timeRange;
  if (typeof options.page === "number") body.page = options.page;
  if (options.location?.trim()) body.location = options.location.trim();
  if (options.device) body.device = options.device;
  if (options.aiAnswer) body.ai_answer = true;
  if (options.includeRaw) body.include_raw = true;
  // Coordinates travel only as a pair — half a position is no position.
  if (
    typeof options.latitude === "number" &&
    typeof options.longitude === "number" &&
    Number.isFinite(options.latitude) &&
    Number.isFinite(options.longitude)
  ) {
    body.latitude = options.latitude;
    body.longitude = options.longitude;
  }
  return body;
}

export interface RunSearchArgs {
  /** Transport — `useBackendApi().post`, so auth/request-id/error capture stay centralized. */
  post: (
    endpoint: string,
    body: unknown,
    signal?: AbortSignal,
  ) => Promise<Response>;
  query: string;
  provider: SearchProvider;
  count: number;
  /** Optional knobs (Search Lab). Omitted = the server's defaults. */
  options?: SearchRequestOptions;
  signal?: AbortSignal;
  /** Fired for every kind instance the server emits, in order. */
  onOutcome: (outcome: SearchOutcome) => void;
}

export async function runKindSearch({
  post,
  query,
  provider,
  count,
  options,
  signal,
  onOutcome,
}: RunSearchArgs): Promise<void> {
  const response = await post(
    "/search-kinds/search",
    { provider, query, count, ...(options ? optionsBody(options) : {}) },
    signal,
  );

  let received = false;
  await consumeStream(
    response,
    {
      onData: (data) => {
        if (
          isRecord(data) &&
          data.type === "search_kinds_result" &&
          isRecord(data.result)
        ) {
          received = true;
          onOutcome({
            result: data.result,
            translation: readTranslation(data.translation),
            raw: isRecord(data.raw) ? data.raw : null,
            ignoredOptions: Array.isArray(data.ignored_options)
              ? data.ignored_options.map(String)
              : [],
            request: isRecord(data.request) ? data.request : null,
            elapsedMs:
              typeof data.elapsed_ms === "number" ? data.elapsed_ms : null,
          });
        }
      },
      onError: (e) => {
        throw new Error(e.user_message || e.message || "The search failed.");
      },
    },
    signal,
  );

  if (!received) {
    throw new Error(
      "The search ended without returning any results. Try again in a moment.",
    );
  }
}
