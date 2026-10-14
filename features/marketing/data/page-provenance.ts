"use client";

/**
 * Why the platform knows a page, and who still asks for it — one RPC,
 * `web.page_provenance(uuid)`. Inbound links count each source page's LATEST
 * snapshot only, so a link the site already removed is never counted.
 *
 * Every page finding needs this answer before its fix means anything: "this
 * address is broken" is useless until it says WHO still sends people there.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";

export interface PageProvenance {
  pageId: string;
  path: string;
  url: string;
  knownSince: string | null;
  /** `web.page.provenance` — crawl | sitemap | gsc | ga4 | manual | … */
  knownFrom: string | null;
  statusNow: number | null;
  discovery: {
    discoveredAt: string | null;
    /** `web.crawl_url.discovery_source` — link | sitemap | seed */
    source: string | null;
    fromPath: string | null;
  } | null;
  /** Last time the address answered 2xx; null = never seen working. */
  everWorkedAt: string | null;
  inbound: {
    sourcePages: number;
    crawledPages: number;
    anchors: { text: string | null; pages: number }[];
    samples: string[];
  };
  sitemaps: string[];
  searchConsole: {
    connected: boolean;
    clicks90d: number;
    impressions90d: number;
    lastImpressionDate: string | null;
  };
  replacements: { pageId: string; path: string; url: string }[];
  workingChildren: { count: number; samples: string[] };
}

type Raw = Record<string, unknown>;

function obj(value: unknown, field: string): Raw {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Raw;
  }
  throw new Error(`page_provenance: "${field}" is not an object`);
}
function num(value: unknown, field: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  throw new Error(`page_provenance: "${field}" is not a number`);
}
function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function strs(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Rejects drifted JSON loudly — a missing count must never read as zero. */
export function parsePageProvenance(raw: unknown): PageProvenance {
  const root = obj(raw, "root");
  const inbound = obj(root.inbound, "inbound");
  const gsc = obj(root.search_console, "search_console");
  const children = obj(root.working_children, "working_children");
  const discovery =
    root.discovery && typeof root.discovery === "object"
      ? (root.discovery as Raw)
      : null;
  return {
    pageId: String(root.page_id),
    path: str(root.path) ?? "/",
    url: str(root.url) ?? "",
    knownSince: str(root.known_since),
    knownFrom: str(root.known_from),
    statusNow: typeof root.status_now === "number" ? root.status_now : null,
    discovery: discovery
      ? {
          discoveredAt: str(discovery.discovered_at),
          source: str(discovery.discovery_source),
          fromPath: str(discovery.from_path),
        }
      : null,
    everWorkedAt: str(root.ever_worked_at),
    inbound: {
      sourcePages: num(inbound.source_pages, "inbound.source_pages"),
      crawledPages: num(inbound.crawled_pages, "inbound.crawled_pages"),
      anchors: (Array.isArray(inbound.anchors) ? inbound.anchors : []).map(
        (a, i) => {
          const row = obj(a, `inbound.anchors[${i}]`);
          return { text: str(row.text), pages: num(row.pages, "anchor.pages") };
        },
      ),
      samples: strs(inbound.samples),
    },
    sitemaps: strs(root.sitemaps),
    searchConsole: {
      connected: gsc.connected === true,
      clicks90d: num(gsc.clicks_90d ?? 0, "search_console.clicks_90d"),
      impressions90d: num(
        gsc.impressions_90d ?? 0,
        "search_console.impressions_90d",
      ),
      lastImpressionDate: str(gsc.last_impression_date),
    },
    replacements: (Array.isArray(root.replacements) ? root.replacements : []).map(
      (r, i) => {
        const row = obj(r, `replacements[${i}]`);
        return {
          pageId: String(row.page_id),
          path: str(row.path) ?? "/",
          url: str(row.url) ?? "",
        };
      },
    ),
    workingChildren: {
      count: num(children.count, "working_children.count"),
      samples: strs(children.samples),
    },
  };
}

export async function getPageProvenance(
  pageId: string,
  signal?: AbortSignal,
): Promise<PageProvenance | null> {
  let request = (await authenticatedWebDb(supabase)).rpc("page_provenance", {
    p_page_id: pageId,
  });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  // NULL = the caller cannot see this page (or it was deleted).
  return data === null ? null : parsePageProvenance(data);
}

export function usePageProvenance(pageId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["marketing", "page-provenance", pageId] as const,
    queryFn: ({ signal }) => getPageProvenance(pageId ?? "", signal),
    enabled: Boolean(pageId) && enabled,
    staleTime: 60_000,
  });
}
