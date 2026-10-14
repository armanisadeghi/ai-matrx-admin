/**
 * Raw result object → the `web_result` kind value the canonical renderer
 * (`components/mardown-display/blocks/search-kinds/item-blocks.tsx` WebResultBlock) draws.
 *
 * Accepts a value that already is a `web_result` (passed through), a raw Brave web result
 * (`title, url, description, extra_snippets, page_age, age, profile, meta_url, thumbnail`) or a
 * raw Google organic result (`title, link, snippet, displayed_link, favicon, date`). Nothing is
 * reshaped beyond field names: the raw object stays the source.
 */

import type { ReviewResult } from "./types";

function s(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function strs(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** The result's address, whichever engine shape it is. */
export function resultUrl(raw: Record<string, unknown>): string | null {
  return s(raw.url) ?? s(raw.link);
}

export function resultTitle(raw: Record<string, unknown>): string | null {
  return s(raw.title) ?? resultUrl(raw);
}

export function toWebResultValue(r: ReviewResult): Record<string, unknown> {
  const raw = r.result;
  if (raw.__kind === "web_result") return raw;
  const url = resultUrl(raw);
  const profile = rec(raw.profile);
  const meta = rec(raw.meta_url);
  const thumb = rec(raw.thumbnail);
  const best = r.hits.length ? Math.min(...r.hits.map((h) => h.rank)) : null;
  return {
    __kind: "web_result",
    source: r.hits[0]?.engine ?? null,
    position: best,
    title: resultTitle(raw),
    url,
    site_name: s(raw.site_name) ?? s(profile.name) ?? s(raw.source) ?? hostOf(url) ?? "",
    displayed_url: s(raw.displayed_url) ?? s(raw.displayed_link) ?? url ?? "",
    snippet: s(raw.snippet) ?? s(raw.description),
    extra_snippets: strs(raw.extra_snippets),
    highlighted_terms: [],
    favicon: s(raw.favicon) ?? s(meta.favicon) ?? s(profile.img),
    thumbnail: s(thumb.src) ?? (typeof raw.thumbnail === "string" ? raw.thumbnail : null),
    published_at: s(raw.page_age) ?? s(raw.published_at),
    age_text: s(raw.age) ?? s(raw.date) ?? s(raw.age_text),
    author: null,
    sitelinks: [],
  };
}
