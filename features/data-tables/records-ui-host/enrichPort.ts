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
  args: { tableId: string; fieldId: string; rows: number; preview: boolean },
): Promise<{ ok: true; run: unknown } | { ok: false; message: string }> {
  try {
    const response = await post(
      `/v1/tables/${encodeURIComponent(args.tableId)}/ai-columns/${encodeURIComponent(args.fieldId)}/run`,
      { rows: Math.max(1, Math.min(50, args.rows)), preview: args.preview },
    );
    if (!response.ok) return { ok: false, message: await refusalSentence(response) };
    return { ok: true, run: await response.json() };
  } catch (thrown) {
    return { ok: false, message: thrown instanceof Error && thrown.message ? thrown.message : "The column could not be filled" };
  }
}

/** Run the AI column once for `ask`, as the person. */
export async function enrichByRunner(post: Post, ask: EnrichAsk): Promise<EnrichOutcome> {
  try {
    const response = await post(
      `/v1/tables/${encodeURIComponent(ask.tableId)}/ai-columns/${encodeURIComponent(ask.fieldId)}/run`,
      { rows: Math.max(1, Math.min(50, ask.rows)), preview: ask.previewOnly },
    );
    if (!response.ok) return { ok: false, message: await refusalSentence(response) };
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
    return { ok: false, message: thrown instanceof Error && thrown.message ? thrown.message : "The column could not be filled" };
  }
}
