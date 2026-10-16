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

const COLUMNS =
  "id, request_id, root_execution_id, parent_execution_id, type, status, cost, meters, link_kind, link_id, error, created_at, started_at, ended_at";

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
  };
}

/** Newest active first, then newest settled (stable on created_at desc). */
function activeFirst<T extends { status: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => Number(TERMINAL.has(a.status)) - Number(TERMINAL.has(b.status)),
  );
}

export async function fetchOperationsByLink(
  linkKind: string,
  linkId: string,
  limit = 20,
): Promise<OperationsByLink> {
  const runtime = createClient().schema("runtime");
  const { data, error } = await runtime
    .from("global_execution")
    .select(COLUMNS)
    .eq("link_kind", linkKind)
    .eq("link_id", linkId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw operationFailed("look up this record's running work", error);
  const linked = (data ?? []) as unknown as ExecutionRow[];
  const cap = Math.max(1, limit);

  if (!COLLAPSES_TO_ROOT.has(linkKind)) {
    const ordered = activeFirst(linked).slice(0, cap);
    const rootIds = [
      ...new Set(ordered.map((r) => r.root_execution_id ?? r.id).filter((id) => !ordered.some((o) => o.id === id))),
    ];
    const roots = new Map<string, ExecutionRow>(ordered.map((r) => [r.id, r]));
    if (rootIds.length) {
      const rootRes = await runtime.from("global_execution").select(COLUMNS).in("id", rootIds);
      if (rootRes.error) throw operationFailed("look up this record's running work", rootRes.error);
      for (const r of (rootRes.data ?? []) as unknown as ExecutionRow[]) roots.set(r.id, r);
    }
    const operations = ordered.map((r) => view(r, roots.get(r.root_execution_id ?? r.id) ?? r));
    return { link_kind: linkKind, link_id: linkId, operation_count: operations.length, operations };
  }

  const rootIds = [...new Set(linked.map((r) => r.root_execution_id ?? r.id))];
  let roots: ExecutionRow[] = linked.filter((r) => r.parent_execution_id == null);
  const missing = rootIds.filter((id) => !roots.some((r) => r.id === id));
  if (missing.length) {
    const rootRes = await runtime.from("global_execution").select(COLUMNS).in("id", missing);
    if (rootRes.error) throw operationFailed("look up this record's running work", rootRes.error);
    roots = roots.concat((rootRes.data ?? []) as unknown as ExecutionRow[]);
  }
  roots = [...new Map(roots.map((r) => [r.id, r])).values()].sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
  const visible = activeFirst(roots).slice(0, cap);
  const operations = visible.map((r) => view(r, r));
  return { link_kind: linkKind, link_id: linkId, operation_count: operations.length, operations };
}
