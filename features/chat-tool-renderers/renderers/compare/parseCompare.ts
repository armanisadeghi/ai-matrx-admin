import type { ToolLifecycleEntry } from "@ai-matrx/chat/agents/types/request.types";
import { resultAsObject } from "@ai-matrx/chat/tool-call-visualization/renderers/_shared";

import { parseQuote, type ComparisonItemInput, type ComparisonQuote, type LookupMatch } from "@/features/comparison/contract";
import { parseDiscoverResult, type DiscoverResult, type ResolveCandidate } from "@/features/comparison/discovery";
import { newRow, type CompareRow } from "@/features/comparison/rows";

export type CompareStatus =
  | "awaiting_confirmation"
  | "needs_clarification"
  | "needs_items"
  | "refused"
  | "status";

export interface FoundThing {
  typed: string;
  status: "found" | "choose" | "not_found";
  name: string | null;
  detail: string;
  logoUrl: string | null;
  website: string | null;
  rating: number | null;
  reviewsCount: number | null;
  message: string | null;
}

export interface ParsedCompare {
  status: CompareStatus;
  kind: string | null;
  message: string | null;
  found: FoundThing[];
  /** The reserved run id: the card follows this run; a 404 on it means "not confirmed yet". */
  runId: string | null;
  /** Exactly what the Confirm click sends. */
  request: unknown;
  quote: ComparisonQuote | null;
  lookupPoints: number;
  /** Concept searches only: how the list was found, in the server's words. */
  howFound: string | null;
  guessed: boolean;
  /** The card's lineup, seeded from what the tool found (clean name + city, the match, the nearest matches). */
  rows: CompareRow[];
  /** A concept's whole found list, to pick from (nothing preselected). */
  discovered: DiscoverResult | null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function matchOf(x: Record<string, unknown>, item: ComparisonItemInput): LookupMatch {
  return {
    item, name: str(x.name) ?? str(x.typed) ?? "", detail: str(x.detail) ?? "", logo_url: str(x.logo_url),
    website: str(x.website), url: str(x.url), rating: num(x.rating), reviews_count: num(x.reviews_count),
  };
}

/** The tool's found rows as lineup cards. An older result (no `item` on its rows) takes each matched row's
 * item from the quoted request, in order. */
export function rowsOf(raw: unknown[], request: unknown): CompareRow[] {
  const quoted = Array.isArray(obj(request).items) ? (obj(request).items as ComparisonItemInput[]) : [];
  let next = 0;
  return raw.filter((x): x is Record<string, unknown> => !!x && typeof x === "object").slice(0, 5).map((x) => {
    const base = { name: str(x.typed) ?? str(x.name) ?? "", city: str(x.city) ?? "", website: str(x.website_typed) ?? "" };
    const candidates: ResolveCandidate[] = (Array.isArray(x.candidates) ? x.candidates : [])
      .map((c) => obj(c)).filter((c) => c.item && typeof c.item === "object")
      .map((c) => ({ match: matchOf(c, c.item as ComparisonItemInput), category: str(c.category) ?? "" }));
    const item = (x.item && typeof x.item === "object" ? x.item : x.status === "found" ? quoted[next++] : null) as ComparisonItemInput | null;
    if (x.status === "found" && item) {
      return newRow({ ...base, state: "found", match: matchOf(x, item), category: str(x.category) ?? "", candidates });
    }
    if (candidates.length) return newRow({ ...base, state: "choose", candidates, message: "Is it one of these?" });
    return newRow({ ...base, state: "not_found", message: str(x.message) ?? "Not found. Fix the name or city." });
  });
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The `compare` tool result, read defensively. Null while the call has no result yet. */
export function parseCompare(entry: ToolLifecycleEntry): ParsedCompare | null {
  const r = resultAsObject(entry);
  if (!r || typeof r.status !== "string") return null;
  const status = r.status as CompareStatus;
  const known: CompareStatus[] = ["awaiting_confirmation", "needs_clarification", "needs_items", "refused"];
  const found: FoundThing[] = (Array.isArray(r.found) ? r.found : [])
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      typed: str(x.typed) ?? "",
      status: x.status === "choose" || x.status === "not_found" ? x.status : "found",
      name: str(x.name),
      detail: str(x.detail) ?? "",
      logoUrl: str(x.logo_url),
      website: str(x.website),
      rating: num(x.rating),
      reviewsCount: num(x.reviews_count),
      message: str(x.message),
    }));
  let quote: ComparisonQuote | null = null;
  if (r.quote && typeof r.quote === "object") {
    try {
      quote = parseQuote(r.quote);
    } catch {
      quote = null;
    }
  }
  return {
    status: known.includes(status) ? status : "status",
    kind: str(r.kind),
    message: str(r.message),
    found,
    runId: str(r.run_id),
    request: r.request ?? null,
    quote,
    lookupPoints: num(r.lookup_points) ?? 0,
    howFound: str(r.how_found),
    guessed: r.guessed === true,
    rows: rowsOf(Array.isArray(r.found) ? r.found : [], r.request),
    discovered: r.discovered ? parseDiscoverResult(r.discovered) : null,
  };
}
