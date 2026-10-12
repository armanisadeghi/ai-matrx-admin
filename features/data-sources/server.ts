/**
 * "Get data" — the compute door to aidream `/data-sources` (contract in `./contract.ts`).
 * Every call names the BOARD's organization (the cost lands there), never the header's selection.
 */

import { getJson, requestRaw } from "@/lib/python-client";
import { parseMatrxNdjsonResponse } from "@ai-matrx/agents/matrx";

import {
  DataFetchRefusal,
  consumeDataFetch,
  parseCatalog,
  parseJob,
  refusalOf,
  type DataFetchInput,
  type DataFetchProgress,
  type DataFetchResult,
  type DataJobState,
  type DataSourceCatalog,
} from "./contract";

const BASE = "/data-sources";

interface CallOptions {
  organizationId: string;
  signal?: AbortSignal;
  onProgress?: (p: DataFetchProgress) => void;
}

function org(organizationId: string): string {
  const id = organizationId?.trim();
  if (!id) throw new DataFetchRefusal("organization_required", "This board's organization is not loaded yet.");
  return id;
}

export async function getDataSources(opts: { organizationId: string; signal?: AbortSignal }): Promise<DataSourceCatalog> {
  const { data } = await getJson<unknown>(BASE, { organizationId: org(opts.organizationId), signal: opts.signal });
  return parseCatalog(data);
}

/** A refusal from a non-2xx answer: the server's `detail` `{code, user_message, limit}` when it sent one. */
async function refusalFromResponse(response: Response): Promise<DataFetchRefusal> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON: fall through to the status line.
  }
  const o = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const detail = o.detail && typeof o.detail === "object" ? (o.detail as Record<string, unknown>) : o;
  if (typeof detail.user_message === "string" || typeof detail.code === "string") return refusalOf(detail);
  const text = typeof o.detail === "string" ? o.detail : `The server answered ${response.status}.`;
  return new DataFetchRefusal(`http_${response.status}`, text);
}

async function stream(path: string, body: unknown, opts: CallOptions): Promise<DataFetchResult> {
  const response = await requestRaw(
    `${BASE}${path}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    { organizationId: org(opts.organizationId), signal: opts.signal, allowHttpError: true },
  );
  if (!response.ok) throw await refusalFromResponse(response);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("ndjson") && !type.includes("event-stream")) {
    const json: unknown = await response.json();
    const job = parseJob(json, "");
    if (job.state === "done") return job.result;
    if (job.state === "failed") throw job.refusal;
    throw new DataFetchRefusal("data_fetch_no_result", "The fetch answered without a table.");
  }
  const parsed = parseMatrxNdjsonResponse(response, opts.signal);
  return consumeDataFetch(parsed.events, opts.onProgress);
}

export function fetchData(
  req: {
    sourceKey: string;
    input: DataFetchInput;
    maxRecords: number;
    tableId?: string | null;
    tableName?: string | null;
    /** Also get the fetched records back in the result (a card or autofill that shows them at once). */
    includeRecords?: boolean;
  },
  opts: CallOptions,
): Promise<DataFetchResult> {
  return stream(
    "/fetch",
    {
      source_key: req.sourceKey,
      ...req.input,
      max_records: req.maxRecords,
      ...(req.includeRecords ? { include_records: true } : {}),
      ...(req.tableId ? { table_id: req.tableId } : req.tableName ? { table_name: req.tableName } : {}),
    },
    opts,
  );
}

export function refreshTable(tableId: string, maxRecords: number | null, opts: CallOptions): Promise<DataFetchResult> {
  return stream(`/tables/${encodeURIComponent(tableId)}/refresh`, maxRecords ? { max_records: maxRecords } : {}, opts);
}

export async function getJob(jobId: string, opts: { organizationId: string; signal?: AbortSignal }): Promise<DataJobState> {
  const { data } = await getJson<unknown>(`${BASE}/jobs/${encodeURIComponent(jobId)}`, {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return parseJob(data, jobId);
}
