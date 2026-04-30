/**
 * features/files/api/rag-ingest.ts
 *
 * Wrapper around the RAG team's `/rag/ingest` and `/rag/ingest/stream`
 * endpoints, scoped to the file-centric UX:
 *
 *   "Process this file for RAG."
 *   "Reprocess (force) this file."
 *
 * The cloud-files surfaces never need to think about `source_kind` —
 * a file is always `cld_file` from this codepath. If/when the Python
 * team adds `POST /files/{file_id}/ingest` (item 14b in REQUESTS.md)
 * we swap the URL inside this module without disturbing call sites.
 *
 * Streaming variant returns an async iterator of progress events the
 * UI renders as a per-stage progress bar (fetch → extract → cleanup →
 * chunk → embed → upsert → complete). Cancelable via AbortController.
 */
import {
  buildHeaders,
  postJson,
  resolveBaseUrl,
} from "@/features/files/api/client";

export interface IngestResponse {
  source_kind: string;
  source_id: string;
  field_id: string | null;
  chunks_written: number;
  embeddings_written: number;
  skipped_unchanged: boolean;
  embedding_model: string;
  error: string | null;
  /**
   * Set when the backend grows the convenience wrapper that
   * surfaces the resulting processed_documents row id directly in
   * the response — until then, the FE re-probes via document-lookup.
   */
  processed_document_id?: string;
}

export interface IngestRequestBody {
  source_kind: "cld_file" | "note" | "code_file";
  source_id: string;
  field_id?: string | null;
  force?: boolean;
}

/** Non-streaming ingest. Resolves with the final `IngestResponse`. */
export async function ingestFile(
  fileId: string,
  opts: { force?: boolean; signal?: AbortSignal } = {},
): Promise<IngestResponse> {
  const { data } = await postJson<IngestResponse, IngestRequestBody>(
    `/rag/ingest`,
    {
      source_kind: "cld_file",
      source_id: fileId,
      force: opts.force ?? false,
    },
    { signal: opts.signal },
  );
  return data;
}

// ---------------------------------------------------------------------------
// Streaming variant — Server-Sent Events / NDJSON line stream.
// Each line is a JSON object `{ event, data }`. The stage events let the
// UI show per-step progress; the final `complete` event carries the
// IngestResponse-equivalent payload.
// ---------------------------------------------------------------------------

export type IngestStreamEvent =
  | { event: "rag.ingest.progress"; data: IngestProgress }
  | { event: "rag.ingest.complete"; data: IngestResponse }
  | { event: "rag.ingest.error"; data: { message: string } };

export interface IngestProgress {
  stage:
    | "fetch"
    | "extract"
    | "cleanup"
    | "chunk"
    | "embed"
    | "upsert"
    | "complete";
  current: number;
  total: number;
  message?: string;
}

/**
 * Subscribe to ingest progress via NDJSON streaming. Returns an async
 * iterable; consume with `for await`. Cancel via the signal.
 *
 *   const ac = new AbortController();
 *   for await (const evt of ingestFileStream(id, { signal: ac.signal })) {
 *     if (evt.event === "rag.ingest.progress") setProgress(evt.data);
 *     if (evt.event === "rag.ingest.complete") onDone(evt.data);
 *   }
 */
export async function* ingestFileStream(
  fileId: string,
  opts: { force?: boolean; signal?: AbortSignal } = {},
): AsyncGenerator<IngestStreamEvent, void, void> {
  const body: IngestRequestBody = {
    source_kind: "cld_file",
    source_id: fileId,
    force: opts.force ?? false,
  };
  // Reuse the same auth/CSRF/baseUrl plumbing as the JSON helpers.
  // The JSON helpers throw on non-OK; we want the stream to emit a
  // structured error event before terminating, so we open the fetch
  // ourselves but pull the headers from the same factory.
  const { headers } = await buildHeaders({ signal: opts.signal }, true);
  const response = await fetch(`${resolveBaseUrl()}/rag/ingest/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!response.ok || !response.body) {
    yield {
      event: "rag.ingest.error",
      data: { message: `HTTP ${response.status}` },
    };
    return;
  }
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      let nl = buffer.indexOf("\n");
      while (nl !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line.length > 0) {
          try {
            const evt = JSON.parse(line) as IngestStreamEvent;
            yield evt;
          } catch {
            /* ignore malformed line — keep streaming */
          }
        }
        nl = buffer.indexOf("\n");
      }
    }
    if (buffer.trim().length > 0) {
      try {
        yield JSON.parse(buffer) as IngestStreamEvent;
      } catch {
        /* ignore */
      }
    }
  } finally {
    reader.releaseLock();
  }
}
