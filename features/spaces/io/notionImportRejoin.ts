// features/spaces/io/notionImportRejoin.ts — a Notion import whose stream dropped follows its run to the end.
//
// ADVERSARIAL-8 F3 (2026-10-22): the dialog printed the stream's "The connection dropped … reconnecting to it now"
// and nothing ever reconnected: the import finished on the server 20+ minutes earlier, the dialog never knew. The
// stream's run is the server's truth: the dialog sends its own request id, so the run is `runtime.global_execution`
// by that id; the server keeps the import's last word (the report, or why it stopped) on that run as a NOTE
// (`notion_import.end`, aidream services/notion_import/service.py `keep_the_end`). Once the run is over that word
// is the answer; a run that failed without one says the run's own error. Only the run's state ends the wait.

import { createClient } from "@/utils/supabase/client";

/** The label of the NOTE the server keeps the import's last word under. */
export const END_NOTE = "notion_import.end";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export interface ImportRunState {
  status: string;
  /** The run's own error sentence, when it failed. */
  error: string | null;
  /** The kept last word (`notion_import.finished` / `.failed` payload), once the run is over. */
  end: Record<string, unknown> | null;
}

function errorSentence(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) if (typeof e[key] === "string" && e[key]) return e[key] as string;
  }
  return null;
}

/** The import's run, by the request id the dialog sent; null while the server has not opened it (or never did). */
export async function readImportRun(requestId: string): Promise<ImportRunState | null> {
  const runtime = createClient().schema("runtime");
  const run = await runtime
    .from("global_execution")
    .select("id, status, error")
    .eq("request_id", requestId)
    .is("parent_execution_id", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (run.error) throw run.error;
  const row = (run.data as Array<{ id: string; status: string; error: unknown }> | null)?.[0];
  if (!row) return null;
  if (!TERMINAL.has(row.status)) return { status: row.status, error: null, end: null };
  const note = await runtime
    .from("global_execution_event")
    .select("detail")
    .eq("execution_id", row.id)
    .eq("kind", "note")
    .eq("detail->>label", END_NOTE)
    .order("created_at", { ascending: false })
    .limit(1);
  if (note.error) throw note.error;
  const detail = (note.data as Array<{ detail: Record<string, unknown> | null }> | null)?.[0]?.detail ?? null;
  return { status: row.status, error: errorSentence(row.error), end: detail };
}

export type ImportRunEnd =
  | { kind: "end"; end: Record<string, unknown> }
  | { kind: "failed"; message: string };

export interface FollowOptions {
  read?: (requestId: string) => Promise<ImportRunState | null>;
  wait?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Between reads. */
  everyMs?: number;
  /** A run the server never opened is said after this long. */
  notFoundMs?: number;
  /** The wait ends (said, never a failure of the import) after this long. */
  giveUpMs?: number;
  /** Is the dialog still waiting? (closed: stop reading). */
  live?: () => boolean;
}

export const LOST_AND_NOT_FOUND =
  "The connection to this import dropped and the server has no run for it. Run it again — nothing is made twice.";
export const STILL_RUNNING =
  "This import is still running on the server. When it ends, its report is in your Import reports table.";
export const FINISHED_WITHOUT_REPORT =
  "The import finished on the server, but its report did not come back here. It is in your Import reports table.";
export const STOPPED_ON_SERVER = "The import stopped on the server. Run it again — nothing is made twice.";

/** Reads the run until it is over; answers its last word, or the honest sentence for what the run says. */
export async function followImportRun(requestId: string, opts: FollowOptions = {}): Promise<ImportRunEnd | null> {
  const read = opts.read ?? readImportRun;
  const wait = opts.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? Date.now;
  const every = opts.everyMs ?? 4_000;
  const notFound = opts.notFoundMs ?? 90_000;
  const giveUp = opts.giveUpMs ?? 60 * 60_000;
  const live = opts.live ?? (() => true);
  const started = now();
  for (;;) {
    if (!live()) return null;
    let state: ImportRunState | null | undefined;
    try {
      state = await read(requestId);
    } catch {
      state = undefined; // a read that failed (a busy database) is read again; only the run's state ends the wait
    }
    if (state === null && now() - started >= notFound) return { kind: "failed", message: LOST_AND_NOT_FOUND };
    if (state && TERMINAL.has(state.status)) {
      if (state.end) return { kind: "end", end: state.end };
      if (state.status === "completed") return { kind: "failed", message: FINISHED_WITHOUT_REPORT };
      return { kind: "failed", message: state.error || STOPPED_ON_SERVER };
    }
    if (now() - started >= giveUp) return { kind: "failed", message: STILL_RUNNING };
    await wait(every);
  }
}
