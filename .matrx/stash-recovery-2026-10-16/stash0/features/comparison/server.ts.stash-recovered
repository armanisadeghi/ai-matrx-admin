/**
 * Compare — the compute door to aidream `/comparison`. Every call names the organization the
 * fetches run in and the raw tables land in (the cost lands there). Contract in `./contract.ts`.
 */

import { getJson, postJson, requestRaw } from "@/lib/python-client";
import { parseMatrxNdjsonResponse } from "@ai-matrx/api";

import {
  ComparisonRefusal,
  consumeComparison,
  parseKinds,
  parseQuote,
  type ComparisonItemInput,
  type ComparisonKindInfo,
  type ComparisonProgress,
  type ComparisonQuote,
  type ComparisonResult,
} from "./contract";

const BASE = "/comparison";

interface Ctx {
  organizationId: string;
  signal?: AbortSignal;
}

function org(organizationId: string): string {
  const id = organizationId?.trim();
  if (!id) throw new ComparisonRefusal("organization_required", "This organization is not loaded yet.");
  return id;
}

export async function getKinds(opts: Ctx): Promise<ComparisonKindInfo[]> {
  const { data } = await getJson<unknown>(BASE, { organizationId: org(opts.organizationId), signal: opts.signal });
  return parseKinds(data);
}

function body(kind: string, items: ComparisonItemInput[], recordsPerItem?: number | null) {
  return {
    kind,
    items: items.map((it) => ({
      ...(it.label ? { label: it.label } : {}),
      ...(it.url ? { url: it.url } : {}),
      ...(it.inputs ? { inputs: it.inputs } : {}),
    })),
    ...(recordsPerItem ? { records_per_item: recordsPerItem } : {}),
  };
}

export async function quoteComparison(
  kind: string,
  items: ComparisonItemInput[],
  opts: Ctx & { recordsPerItem?: number | null },
): Promise<ComparisonQuote> {
  const { data } = await postJson<unknown>(`${BASE}/quote`, body(kind, items, opts.recordsPerItem), {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return parseQuote(data);
}

async function refusalFromResponse(response: Response): Promise<ComparisonRefusal> {
  let b: unknown = null;
  try {
    b = await response.json();
  } catch {
    // not JSON
  }
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  const detail = o.detail && typeof o.detail === "object" ? (o.detail as Record<string, unknown>) : o;
  const code = typeof detail.code === "string" ? detail.code : `http_${response.status}`;
  const msg = typeof detail.user_message === "string" ? detail.user_message
    : typeof o.detail === "string" ? o.detail : `The server answered ${response.status}.`;
  return new ComparisonRefusal(code, msg);
}

export async function runComparison(
  kind: string,
  items: ComparisonItemInput[],
  opts: Ctx & { recordsPerItem?: number | null; onProgress?: (p: ComparisonProgress) => void },
): Promise<ComparisonResult> {
  const response = await requestRaw(
    `${BASE}/run`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(kind, items, opts.recordsPerItem)) },
    { organizationId: org(opts.organizationId), signal: opts.signal, allowHttpError: true },
  );
  if (!response.ok) throw await refusalFromResponse(response);
  const parsed = parseMatrxNdjsonResponse(response, opts.signal);
  return consumeComparison(parsed.events, opts.onProgress);
}
