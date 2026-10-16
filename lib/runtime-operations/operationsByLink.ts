/**
 * "Which operations run (or ran) for this record?" — read straight from
 * `runtime.global_execution` through row-level security; the Python server is
 * not involved. Same answer the old `GET /runtime/operations/by-link/{kind}/{id}`
 * gave: newest ACTIVE run first, then newest settled; for a conversation the
 * answer collapses to the trees' ROOT executions.
 */
import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);
/** Link kinds whose answer is the tree's root, whichever node carried the link. */
const COLLAPSES_TO_ROOT = new Set(["conversation"]);

// Widened to `string`: the JSON-path alias makes the PostgREST select parser exceed TS's
// instantiation depth (TS2589); every read states its row shape with `.returns<>()`.
const COLUMNS: string =
  "id, request_id, root_execution_id, parent_execution_id, type, status, cost, meters, link_kind, link_id, error, created_at, started_at, ended_at, stream_mode:context->stream_run->>mode";

interface ExecutionRow {
  id: string;
  request_id: string | null;
  root_execution_id: string | null;
  parent_execution_id: string | null;
  type: string;
  status: string;
  cost: number | null;
  meters: Record<string, number> | null;
  link_kind: string | null;
  link_id: string | null;
  error: Record<string, unknown> | null;
  created_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  /** `context.stream_run.mode`: "auto" marks a stream's auto run. */
  stream_mode?: string | null;
}

export interface LinkedOperation {
  execution_id: string;
  request_id: string | null;
  root_execution_id: string;
  root_request_id: string | null;
  type: string;
  status: string;
  is_terminal: boolean;
  waiting_input: boolean;
  cost: number;
  meters: Record<string, number>;
  link_kind: string | null;
  link_id: string | null;
  error: Record<string, unknown> | null;
  created_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  /** Public event paths of the execution (derived; the server built the same strings). */
  events_path: string;
  stream_path: string;
  /**
   * The execution's current event cursor (what a follower resumes from). Present only when the
   * caller asked for it (`eventCursor: true`), because it is one extra read per operation.
   */
  last_event_seq?: number;
}

export interface OperationsByLinkOptions {
  /** Also read each operation's latest event seq (`last_event_seq`) for followers. */
  eventCursor?: boolean;
}

export interface OperationsByLink {
  link_kind: string;
  link_id: string;
  operation_count: number;
  operations: LinkedOperation[];
}

function publicError(err: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!err) return err;
  const { traceback: _traceback, ...rest } = err;
  return rest;
}

function view(row: ExecutionRow, root: ExecutionRow): LinkedOperation {
  return {
    execution_id: row.id,
    request_id: row.request_id,
    root_execution_id: root.id,
    root_request_id: root.request_id,
    type: row.type,
    status: row.status,
    is_terminal: TERMINAL.has(row.status),
    waiting_input: row.status === "waiting_input",
    cost: Number(row.cost ?? 0),
    meters: row.meters ?? {},
    link_kind: row.link_kind,
    link_id: row.link_id,
    error: publicError(row.error),
    created_at: row.created_at,
    started_at: row.started_at,
    ended_at: row.ended_at,
    events_path: `/api/runtime/executions/${row.id}/events`,
    stream_path: `/api/runtime/executions/${row.id}/events/stream`,
  };
}

/** Same value the server computed: the newest event seq of the tree rooted at the execution. */
async function withEventCursors(operations: LinkedOperation[]): Promise<LinkedOperation[]> {
  const runtime = createClient().schema("runtime");
  return Promise.all(
    operations.map(async (op) => {
      const res = await runtime
        .from("global_execution_event")
        .select("seq")
        .eq("root_execution_id", op.execution_id)
        .not("seq", "is", null)
        .order("seq", { ascending: false })
        .limit(1);
      if (res.error) throw operationFailed("look up this record's running work", res.error);
      const seq = (res.data as unknown as Array<{ seq: number | null }> | null)?.[0]?.seq;
      return { ...op, last_event_seq: Number(seq ?? 0) };
    }),
  );
}

/** Newest active first, then newest settled (stable on created_at desc). */
function activeFirst<T extends { status: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => Number(TERMINAL.has(a.status)) - Number(TERMINAL.has(b.status)),
  );
}

const isAutoRoot = (r: ExecutionRow) => r.parent_execution_id == null && r.stream_mode === "auto";

/**
 * Same rule as the server's `_without_superseded_auto_runs`: a stream's AUTO run
 * is hidden once the work opened its own (non-auto) root for the same request.
 * If the request has no other root, the auto run stays.
 */
async function withoutSupersededAutoRuns(rows: ExecutionRow[]): Promise<ExecutionRow[]> {
  const runtime = createClient().schema("runtime");
  const autos = rows.filter((r) => isAutoRoot(r) && r.request_id);
  if (!autos.length) return rows;
  const requestIds = [...new Set(autos.map((r) => r.request_id as string))];
  // The JSON-path alias makes PostgREST's select parser recurse past TS's depth limit
  // (TS2589); the select is widened to `string` and the row shape stated with `.returns<>()`.
  const rootColumns: string =
    "id, request_id, parent_execution_id, stream_mode:context->stream_run->>mode";
  const res = await runtime
    .from("global_execution")
    .select(rootColumns)
    .in("request_id", requestIds)
    .is("parent_execution_id", null)
    .returns<Pick<ExecutionRow, "id" | "request_id" | "parent_execution_id" | "stream_mode">[]>();
  if (res.error) throw operationFailed("look up this record's running work", res.error);
  const withOwnRoot = new Set<string>();
  for (const r of res.data ?? []) {
    if (r.request_id && r.stream_mode !== "auto") withOwnRoot.add(r.request_id);
  }
  return rows.filter((r) => !(isAutoRoot(r) && r.request_id && withOwnRoot.has(r.request_id)));
}

export async function fetchOperationsByLink(
  linkKind: string,
  linkId: string,
  limit = 20,
  options: OperationsByLinkOptions = {},
): Promise<OperationsByLink> {
  const runtime = createClient().schema("runtime");
  const { data, error } = await runtime
    .from("global_execution")
    .select(COLUMNS)
    .eq("link_kind", linkKind)
    .eq("link_id", linkId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ExecutionRow[]>();
  if (error) throw operationFailed("look up this record's running work", error);
  const fetched = data ?? [];
  const cap = Math.max(1, limit);

  if (!COLLAPSES_TO_ROOT.has(linkKind)) {
    const linked = await withoutSupersededAutoRuns(fetched);
    const ordered = activeFirst(linked).slice(0, cap);
    const rootIds = [
      ...new Set(ordered.map((r) => r.root_execution_id ?? r.id).filter((id) => !ordered.some((o) => o.id === id))),
    ];
    const roots = new Map<string, ExecutionRow>(ordered.map((r) => [r.id, r]));
    if (rootIds.length) {
      const rootRes = await runtime.from("global_execution").select(COLUMNS).in("id", rootIds).returns<ExecutionRow[]>();
      if (rootRes.error) throw operationFailed("look up this record's running work", rootRes.error);
      for (const r of rootRes.data ?? []) roots.set(r.id, r);
    }
    let operations = ordered.map((r) => view(r, roots.get(r.root_execution_id ?? r.id) ?? r));
    if (options.eventCursor) operations = await withEventCursors(operations);
    return { link_kind: linkKind, link_id: linkId, operation_count: operations.length, operations };
  }

  const linked = fetched;
  const rootIds = [...new Set(linked.map((r) => r.root_execution_id ?? r.id))];
  let roots: ExecutionRow[] = linked.filter((r) => r.parent_execution_id == null);
  const missing = rootIds.filter((id) => !roots.some((r) => r.id === id));
  if (missing.length) {
    const rootRes = await runtime.from("global_execution").select(COLUMNS).in("id", missing).returns<ExecutionRow[]>();
    if (rootRes.error) throw operationFailed("look up this record's running work", rootRes.error);
    roots = roots.concat(rootRes.data ?? []);
  }
  roots = [...new Map(roots.map((r) => [r.id, r])).values()].sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
  const visible = activeFirst(roots).slice(0, cap);
  let operations = visible.map((r) => view(r, r));
  if (options.eventCursor) operations = await withEventCursors(operations);
  return { link_kind: linkKind, link_id: linkId, operation_count: operations.length, operations };
}
