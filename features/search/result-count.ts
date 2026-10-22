/**
 * The count on a web results page — the ONE number, the same for every visitor.
 *
 * It used to add every band together (results + news + videos + discussions). The engine's news and
 * video bands come and go between two identical searches, so the same query read "36 results" for one
 * visitor and "16 results" for another a minute later (live walk 2026-10-21; the server answers a
 * visitor and a member identically — same engine, same request, same order). Google counts the
 * organic results only, so this does too: a web answer is counted by its organic list, never its bands.
 */

/** Organic results on a web answer, or null when the answer is not a web page of results. */
export function organicResultCount(result: Record<string, unknown>): number | null {
  const vertical = result.vertical;
  const isWeb =
    (result.__kind === "web_search_results" || result.__kind === undefined) &&
    (vertical === undefined || vertical === null || vertical === "web");
  if (!isWeb || !Array.isArray(result.results)) return null;
  return result.results.filter((r) => typeof r === "object" && r !== null).length;
}
