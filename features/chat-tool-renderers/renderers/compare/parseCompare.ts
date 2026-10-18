import type { ToolLifecycleEntry } from "@ai-matrx/chat/agents/types/request.types";
import { resultAsObject } from "@ai-matrx/chat/tool-call-visualization/renderers/_shared";

import { parseQuote, type ComparisonQuote } from "@/features/comparison/contract";

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
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
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
  };
}
