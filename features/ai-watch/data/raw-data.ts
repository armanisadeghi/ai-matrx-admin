/**
 * Watch AI — the exact data of every step, in three labelled tiers (Arman, 2026-10-22: "the exact
 * data we got, not what we got and then played with").
 *
 *  - RAW            exactly what came back (a vendor body, a tool's whole result before any cut) —
 *                   the server's capture index `metadata.raw_capture` on `chat.tool_call` /
 *                   `workflow.node_outcome` (aidream `services/ai_watch/raw_capture_sink.py`);
 *  - SENT TO MODEL  exactly what the model received: the `tool_result` block with this call id in
 *                   a LATER iteration's provider request (`chat.request_snapshot`, every iteration
 *                   it was sent in) — never `chat.tool_call.output`, which is the stored result;
 *  - PASSED ON      a workflow step's output as the next step received it (`node_outcome.output`);
 *  - DISPLAY        the pretty view (the tool's own renderer / the kind's component).
 *
 * Between RAW and SENT: the cut trail — every cut, where, before → after, the limit's name.
 * Pure functions only (tested); the readers are in `ai-watch-data-reads.ts`.
 */

/** The tier labels. Every pane that shows a value carries one (guard: `pnpm check:ai-watch`). */
export const DATA_TIERS = {
  raw: "RAW",
  sent: "SENT TO MODEL",
  passed: "PASSED ON",
  display: "DISPLAY",
} as const;
export type DataTier = keyof typeof DATA_TIERS;

export interface RawEntry {
  label: string;
  source: string;
  kept: boolean;
  reason: string | null;
  bytes: number | null;
  sha256: string | null;
  contentType: string | null;
  statusCode: number | null;
  capturedAt: string | null;
  /** The bytes inline (decoded text) — exact when `inlineEncoding` is utf-8. */
  inline: string | null;
  inlineEncoding: "utf-8" | "base64" | null;
  /** A stored file (gzip) holding the exact bytes. */
  fileId: string | null;
  /** The raw lives elsewhere (e.g. `chat.tool_call.output` when nothing was cut). */
  ref: { table: string; column?: string; chars?: number } | null;
  detail: Record<string, unknown> | null;
}

export interface CutEntry {
  where: string;
  field: string | null;
  before: number;
  after: number;
  limitName: string;
  limit: number | null;
  unit: string;
}

export interface RawCapture {
  version: number;
  capturedAt: string | null;
  raw: RawEntry[];
  cuts: CutEntry[];
  facts: Record<string, unknown>;
  droppedItems: number;
  droppedCuts: number;
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** The capture index on a row's metadata, or null when the row was recorded before capture existed. */
export function readRawCapture(metadata: unknown): RawCapture | null {
  const index = obj(obj(metadata)?.raw_capture);
  if (!index) return null;
  const raw = Array.isArray(index.raw) ? index.raw : [];
  const cuts = Array.isArray(index.cuts) ? index.cuts : [];
  return {
    version: num(index.v) ?? 0,
    capturedAt: str(index.captured_at),
    raw: raw.map((r) => {
      const e = obj(r) ?? {};
      const ref = obj(e.ref);
      const enc = e.inline_encoding === "base64" ? "base64" : e.inline_encoding === "utf-8" ? "utf-8" : null;
      return {
        label: str(e.label) ?? "Raw answer",
        source: str(e.source) ?? "",
        kept: e.kept !== false,
        reason: str(e.reason),
        bytes: num(e.bytes),
        sha256: str(e.sha256),
        contentType: str(e.content_type),
        statusCode: num(e.status_code),
        capturedAt: str(e.captured_at),
        inline: typeof e.inline === "string" ? e.inline : null,
        inlineEncoding: typeof e.inline === "string" ? (enc ?? "utf-8") : null,
        fileId: str(e.file_id),
        ref: ref && str(ref.table) ? { table: String(ref.table), column: str(ref.column) ?? undefined, chars: num(ref.chars) ?? undefined } : null,
        detail: obj(e.detail),
      };
    }),
    cuts: cuts.map((c) => {
      const e = obj(c) ?? {};
      return {
        where: str(e.where) ?? "cut",
        field: str(e.field),
        before: num(e.before) ?? 0,
        after: num(e.after) ?? 0,
        limitName: str(e.limit_name) ?? "limit",
        limit: num(e.limit),
        unit: str(e.unit) ?? "chars",
      };
    }),
    facts: obj(index.facts) ?? {},
    droppedItems: num(index.dropped_items) ?? 0,
    droppedCuts: num(index.dropped_cuts) ?? 0,
  };
}

/** One cut as a line: `size gate · 406,747 → 50,000 chars · TOOL_RESULT_SOFT_CAP_CHARS = 50,000`. */
export function cutLine(cut: CutEntry): string {
  const where = cut.field ? `${cut.where} · ${cut.field}` : cut.where;
  const limit = cut.limit != null ? `${cut.limitName} = ${cut.limit.toLocaleString()}` : cut.limitName;
  return `${where} · ${cut.before.toLocaleString()} → ${cut.after.toLocaleString()} ${cut.unit} · ${limit}`;
}

/** A size for a tab title. */
export function sizeLabel(n: number | null | undefined, unit: "chars" | "bytes" = "chars"): string {
  return n == null ? "size unknown" : `${n.toLocaleString()} ${unit}`;
}

export interface SentCopy {
  /** The iteration whose provider request carried it. */
  iteration: number | null;
  snapshotId: string;
  /** The content exactly as the request carried it (text, or the provider's block list). */
  content: unknown;
  chars: number;
  /** How the block was matched to the call ("call id", or "tool name" for a provider without ids). */
  matchedBy: "call id" | "tool name";
}

interface SnapshotLike {
  id: string;
  iteration: number | null;
  requestPayload: Record<string, unknown> | null;
}

function contentChars(content: unknown): number {
  if (typeof content === "string") return content.length;
  if (Array.isArray(content)) {
    return content.reduce<number>((n, part) => {
      const p = obj(part);
      return n + (typeof p?.text === "string" ? p.text.length : JSON.stringify(part ?? null).length);
    }, 0);
  }
  return JSON.stringify(content ?? null).length;
}

/**
 * Every copy of one tool call's result a provider request carried, oldest iteration first. Reads the
 * shapes the stored requests use: Anthropic `tool_result` blocks (`tool_use_id`), OpenAI Responses
 * `function_call_output` items (`call_id`), chat-completions `role: "tool"` messages (`tool_call_id`),
 * Gemini `functionResponse` parts (`id`, else the tool name).
 */
export function sentToModel(callId: string, toolName: string | null, snapshots: readonly SnapshotLike[]): SentCopy[] {
  const out: SentCopy[] = [];
  for (const snap of snapshots) {
    const body = snap.requestPayload;
    if (!body) continue;
    const push = (content: unknown, matchedBy: SentCopy["matchedBy"]) =>
      out.push({ iteration: snap.iteration, snapshotId: snap.id, content, chars: contentChars(content), matchedBy });
    const messages = Array.isArray(body.messages) ? body.messages : [];
    for (const m of messages) {
      const msg = obj(m);
      if (!msg) continue;
      if (msg.role === "tool" && msg.tool_call_id === callId) push(msg.content, "call id");
      if (Array.isArray(msg.content)) {
        for (const b of msg.content) {
          const block = obj(b);
          if (block?.type === "tool_result" && block.tool_use_id === callId) push(block.content, "call id");
        }
      }
    }
    const input = Array.isArray(body.input) ? body.input : [];
    for (const i of input) {
      const item = obj(i);
      if (item?.type === "function_call_output" && item.call_id === callId) push(item.output, "call id");
    }
    const contents = Array.isArray(body.contents) ? body.contents : [];
    for (const c of contents) {
      const parts = Array.isArray(obj(c)?.parts) ? (obj(c)?.parts as unknown[]) : [];
      for (const p of parts) {
        const fr = obj(obj(p)?.functionResponse ?? obj(p)?.function_response);
        if (!fr) continue;
        if (fr.id === callId) push(fr.response, "call id");
        else if (!fr.id && toolName && fr.name === toolName.replace(/[:.]/g, "__")) push(fr.response, "tool name");
      }
    }
  }
  return out.sort((a, b) => (a.iteration ?? 0) - (b.iteration ?? 0));
}

/** Iterations whose copy differs from the first one sent (a later context trim stubbed or re-cut it). */
export function changedCopies(copies: readonly SentCopy[]): number[] {
  if (copies.length < 2) return [];
  const first = JSON.stringify(copies[0].content);
  return copies.filter((c) => JSON.stringify(c.content) !== first).map((c) => c.iteration ?? 0);
}

export interface WebOriginal {
  url: string;
  processedDocumentId: string;
}

/** A web read's pages that carry their stored Source (`pages[].processed_document_id`). */
export function webReadOriginals(toolName: string | null, output: string | null): WebOriginal[] {
  if (!output || !toolName || !/(^|[._])web$|read_page|batch_read/.test(toolName)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    // Stored at the 100,000-char storage cut: the pages before the cut still name their Source.
    const ids = [...output.matchAll(/"url":\s*"([^"]+)"[^{}]*?"processed_document_id":\s*"([0-9a-f-]{36})"/g)];
    return ids.map((m) => ({ url: m[1], processedDocumentId: m[2] }));
  }
  const pages = Array.isArray(obj(parsed)?.pages) ? (obj(parsed)?.pages as unknown[]) : [];
  return pages.flatMap((p) => {
    const page = obj(p);
    const id = str(page?.processed_document_id);
    return id ? [{ url: str(page?.url) ?? "", processedDocumentId: id }] : [];
  });
}

/** Why a row has no RAW tier, in the window's words. */
export function rawMissingReason(capture: RawCapture | null): string {
  return capture ? "Nothing came back to keep" : "Raw not kept — recorded before raw capture existed";
}
