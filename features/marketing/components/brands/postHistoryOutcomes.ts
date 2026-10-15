/**
 * What the server's "Fetch post history" step last said about each of a brand's accounts — from the
 * brand's Smart Add setup run and its ingest runs (`workflow.node_outcome`, node `history`). A walk the
 * provider refused before any post landed is an error there (MKT-057); the Background work row shows
 * it instead of "0 posts" with a done mark.
 */
import { supabase } from "@/utils/supabase/client";

export interface PostHistoryNote {
  /** The provider refused the account's walk before any post landed. */
  error: string | null;
  /** What the walk said otherwise (stopped early, saved place expired, ...). */
  notes: string[];
  at: string;
}

interface OutcomeLike {
  completed_at: string | null;
  output: unknown;
  error: unknown;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function accountKey(handleOrUrl: string): string {
  return handleOrUrl.trim().toLowerCase().replace(/^@/, "").replace(/\/+$/, "");
}

/** Latest word per account (keyed by `accountKey`), oldest outcome first in, newest wins. */
export function postHistoryNotes(outcomes: OutcomeLike[]): Map<string, PostHistoryNote> {
  const out = new Map<string, PostHistoryNote>();
  const sorted = [...outcomes].sort((a, b) => String(a.completed_at ?? "").localeCompare(String(b.completed_at ?? "")));
  for (const o of sorted) {
    // A failed step's accounts ride its error details; a finished step's ride its output.
    const accounts = record(o.output).accounts ?? record(record(o.error).details).accounts;
    if (!Array.isArray(accounts)) continue;
    for (const raw of accounts) {
      const a = record(raw);
      if (typeof a.handle_or_url !== "string" || typeof a.skipped === "string") continue;
      out.set(accountKey(a.handle_or_url), {
        error: typeof a.error === "string" && a.error ? a.error : null,
        notes: Array.isArray(a.notes) ? a.notes.filter((n): n is string => typeof n === "string") : [],
        at: String(o.completed_at ?? ""),
      });
    }
  }
  return out;
}

/** The brand's setup + ingest runs' history outcomes. `subjects`: `brand:<id>`, `ingest:<id>`. */
export async function loadPostHistoryNotes(subjects: string[]): Promise<Map<string, PostHistoryNote>> {
  if (!subjects.length) return new Map();
  const runs = await supabase
    .schema("workflow")
    .from("run")
    .select("id")
    .in("metadata->system_workflow->>subject", subjects)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (runs.error) throw new Error(runs.error.message);
  const ids = (runs.data ?? []).map((r) => r.id as string);
  if (!ids.length) return new Map();
  const outcomes = await supabase
    .schema("workflow")
    .from("node_outcome")
    .select("completed_at, output, error")
    .in("run_id", ids)
    .eq("node_id", "history")
    .order("completed_at", { ascending: true })
    .limit(200);
  if (outcomes.error) throw new Error(outcomes.error.message);
  return postHistoryNotes(outcomes.data ?? []);
}
