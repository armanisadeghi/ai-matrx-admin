// System processes queue (aidream services/system_processes): the standing system_process_queue executions,
// their runtime.work_item rows, and the system_processes knobs. Read direct from the browser; admin reads every row.
import { readAllRows } from "@ai-matrx/data/db";
import { supabase } from "@/utils/supabase/client";

export const STATES = ["pending", "in_progress", "succeeded", "failed", "dead_letter"] as const;
export type QueueState = (typeof STATES)[number];

export interface QueueItem {
  id: string;
  process: string;
  subjectId: string;
  state: string;
  outcome: string;
  attempts: number;
  maxAttempts: number;
  due: string;
  updatedAt: string;
  error: string;
}

export interface KnobValue {
  key: string;
  label: string;
  value: string;
}

export interface QueueSnapshot {
  items: QueueItem[];
  knobs: KnobValue[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function errorMessage(e: unknown): string {
  if (e === null || e === undefined) return "";
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const o = e as Record<string, unknown>;
    const m = o.message ?? o.error ?? o.detail;
    if (typeof m === "string") return m;
  }
  return JSON.stringify(e);
}

export async function fetchQueue(): Promise<QueueSnapshot> {
  const runtime = supabase.schema("runtime");
  const execs = await readAllRows(({ from, to }) =>
    runtime
      .from("global_execution")
      .select("id", { count: "exact" })
      .eq("type", "system_process_queue")
      .order("id", { ascending: true })
      .range(from, to),
    { label: "runtime.global_execution (system_process_queue)" },
  );
  const ids = execs.map((e) => e.id);

  // One process execution today; batched so a growing list keeps the PostgREST URL short.
  const rows: Awaited<ReturnType<typeof readWorkItems>> = [];
  for (let i = 0; i < ids.length; i += 200) rows.push(...(await readWorkItems(ids.slice(i, i + 200))));

  const items: QueueItem[] = rows.map((r) => {
    const sep = r.canonical_key.indexOf(":");
    const payload = (r.payload && typeof r.payload === "object" && !Array.isArray(r.payload) ? r.payload : {}) as Record<string, unknown>;
    return {
      id: r.id,
      process: sep > 0 ? r.canonical_key.slice(0, sep) : r.canonical_key,
      subjectId: sep > 0 ? r.canonical_key.slice(sep + 1) : str(payload.subject_id),
      state: r.state,
      outcome: str(payload.outcome),
      attempts: r.attempts,
      maxAttempts: r.max_attempts,
      due: r.not_before ?? "",
      updatedAt: r.updated_at,
      error: errorMessage(r.error),
    };
  });

  // archived-items-law-exempt: effective-setting lookup — these knobs decide each process's On/Off state, and an archived knob is not in effect
  const knobRows = await readAllRows(({ from, to }) =>
    supabase
      .schema("platform")
      .from("feature_knob")
      .select("key, label, value", { count: "exact" })
      .eq("feature", "system_processes")
      .is("archived_at", null)
      .order("key", { ascending: true })
      .range(from, to),
    { label: "platform.feature_knob (system_processes)" },
  );
  const knobs: KnobValue[] = knobRows.map((k) => ({
    key: k.key,
    label: k.label,
    value: typeof k.value === "string" ? k.value : JSON.stringify(k.value),
  }));

  return { items, knobs };
}

function readWorkItems(ids: string[]) {
  return readAllRows(({ from, to }) =>
    supabase
      .schema("runtime")
      .from("work_item")
      .select(
        "id, canonical_key, state, attempts, max_attempts, not_before, error, payload, created_at, updated_at",
        { count: "exact" },
      )
      .in("execution_id", ids)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
    { label: "runtime.work_item (system processes)" },
  );
}
