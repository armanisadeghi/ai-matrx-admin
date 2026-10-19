/**
 * THE AI COLUMN'S RUNNER (records-ui host port `enrich`, custom-data PLAN §4 M2).
 *
 * Preview and Fill on an AI column go to the server's ONE enrichment runner —
 * `POST /v1/tables/{table}/ai-columns/{field}/run` — whose model is the `table.column_fill` mandate.
 * The server lands each value through `custom.enrich_land` as `agent` on behalf of the signed-in
 * person, so History names both; a browser never stamps itself an agent. The run's cost comes back
 * in cents and the package shows it only as points (`pointsRate`).
 */

import type { EnrichAsk, EnrichOutcome } from "@ai-matrx/records-ui";

type Post = (endpoint: string, body: unknown) => Promise<Response>;

/**
 * WATCH AI FOLLOWS THE RUN (lane AI-COLUMN, Arman 2026-10-19: "if I click debug mode and I open the Builder/AI Watch,
 * I need to be able to easily see the exact data being handed to the agent"). Given only to a debug-mode admin: the
 * run carries a fresh `watch_id`, the server stamps it on every row's AI call, and the run is registered as followed
 * work (`ai_column_run`) BEFORE the request goes, so Watch AI lists each row's exact request as it lands.
 */
export type WatchRun = (watchId: string, label: string) => WatchEnd | void;
/** Told how the request ended, so a run that failed before any AI call closes as failed with the reason. */
export type WatchEnd = (outcome: { ok: boolean; reason?: string }) => void;

function watchBody(watch: WatchRun | undefined, label: string): { body: { watch_id?: string }; end: WatchEnd } {
  if (!watch) return { body: {}, end: () => undefined };
  const watchId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const end = watch(watchId, label);
  return { body: { watch_id: watchId }, end: end ?? (() => undefined) };
}

interface AiColumnRun {
  rows_seen?: number;
  rows_written?: number;
  cost_cents?: number;
  says?: string;
  would_write?: Array<{ record_id: string; value?: unknown; absent?: string }>;
}

/** The refusal's own sentence from an API error body, else a plain one. */
async function refusalSentence(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown; detail?: unknown };
    if (typeof body.message === "string" && body.message) return body.message;
    if (typeof body.detail === "string" && body.detail) return body.detail;
  } catch {
    // not JSON — fall through to the status sentence
  }
  return `The column could not be filled (${response.status}).`;
}

/**
 * Run (or, with `preview`, QUOTE) an AI column and hand back the server's whole answer. A column
 * filled from live data answers a preview with its points quote and fetches nothing
 * (`features/data-sources/live-column`).
 */
export async function runAiColumn(
  post: Post,
  args: { tableId: string; fieldId: string; rows: number; preview: boolean; recordIds?: readonly string[] },
  watch?: WatchRun,
): Promise<{ ok: true; run: unknown } | { ok: false; message: string }> {
  const watched = watchBody(watch, args.preview ? "AI column preview" : "AI column fill");
  try {
    const response = await post(
      `/v1/tables/${encodeURIComponent(args.tableId)}/ai-columns/${encodeURIComponent(args.fieldId)}/run`,
      {
        rows: Math.max(1, Math.min(50, args.rows)),
        preview: args.preview,
        ...(args.recordIds && args.recordIds.length > 0 ? { record_ids: [...args.recordIds] } : {}),
        ...watched.body,
      },
    );
    if (!response.ok) {
      const message = await refusalSentence(response);
      watched.end({ ok: false, reason: message });
      return { ok: false, message };
    }
    watched.end({ ok: true });
    return { ok: true, run: await response.json() };
  } catch (thrown) {
    const message = thrown instanceof Error && thrown.message ? thrown.message : "The column could not be filled";
    watched.end({ ok: false, reason: message });
    return { ok: false, message };
  }
}

/** Run the AI column once for `ask`, as the person. */
export async function enrichByRunner(post: Post, ask: EnrichAsk, watch?: WatchRun): Promise<EnrichOutcome> {
  const watched = watchBody(watch, ask.previewOnly ? "AI column preview" : "AI column fill");
  try {
    const response = await post(
      `/v1/tables/${encodeURIComponent(ask.tableId)}/ai-columns/${encodeURIComponent(ask.fieldId)}/run`,
      {
        rows: Math.max(1, Math.min(50, ask.rows)),
        preview: ask.previewOnly,
        ...watched.body,
      },
    );
    if (!response.ok) {
      const message = await refusalSentence(response);
      watched.end({ ok: false, reason: message });
      return { ok: false, message };
    }
    watched.end({ ok: true });
    const run = (await response.json()) as AiColumnRun;
    return {
      ok: true,
      message:
        run.says ||
        (ask.previewOnly ? `Previewed ${run.rows_seen ?? 0} rows.` : `Filled in ${run.rows_written ?? 0} of ${run.rows_seen ?? 0}.`),
      ...(typeof run.cost_cents === "number" ? { costCents: run.cost_cents } : {}),
      ...(typeof run.rows_written === "number" ? { rowsWritten: run.rows_written } : {}),
      ...(run.would_write ? { wouldWrite: run.would_write } : {}),
    };
  } catch (thrown) {
    const message = thrown instanceof Error && thrown.message ? thrown.message : "The column could not be filled";
    watched.end({ ok: false, reason: message });
    return { ok: false, message };
  }
}
