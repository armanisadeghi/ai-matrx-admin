/**
 * The system-error ledger, read straight from Supabase (`ops.system_error`).
 *
 * Replaces `GET /admin/system-errors/recent`, which only filtered, counted and
 * paged these rows. Platform admins can read the table (`platform_admin_read`),
 * so the browser reads it directly. Same contract as the server handler:
 * a frozen snapshot (`created_at <= snapshot`), a window (`occurred_at > cutoff`),
 * newest first by (`occurred_at`, `id`), keyset cursor, one `total` for the
 * whole frozen window, and `limit + 1` to learn whether another page exists.
 */

import { createClient } from "@/utils/supabase/client";
import type { components } from "@ai-matrx/api/types";

type SystemErrorRow = components["schemas"]["SystemErrorRecord"];
export type RecentSystemErrorsResponse =
  components["schemas"]["aidream__api__routers__admin_system_errors__SystemErrorListResponse"];

export interface RecentSystemErrorsQuery {
  since_hours: number;
  limit: number;
  /** Frozen by the first page (the database's clock); every later page carries it. */
  snapshot_at?: string;
  /** The first page's count of the frozen window; later pages carry it instead of recounting. */
  total?: number;
  cursor_occurred_at?: string;
  cursor_id?: string;
  kind?: string;
  request_id?: string;
  unresolved_only?: boolean;
}

const COLUMNS =
  "id,kind,request_id,user_id,conversation_id,agent_id,source_app,source_feature,route,error_type,error_text,traceback,payload,context,occurred_at,resolved_at,resolution_note";

/** The database's own clock (`ops.server_now()`): a skewed browser clock cannot drop new rows. */
async function databaseNow(): Promise<Date> {
  // `ops.server_now` is newer than the generated types; the call shape is fixed.
  const ops = createClient().schema("ops") as unknown as {
    rpc: (fn: string) => PromiseLike<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await ops.rpc("server_now");
  if (error || !data) throw new Error(error?.message ?? "The database clock did not answer.");
  return new Date(data);
}

export async function fetchRecentSystemErrors(
  q: RecentSystemErrorsQuery,
): Promise<RecentSystemErrorsResponse> {
  const snapshot = q.snapshot_at ? new Date(q.snapshot_at) : await databaseNow();
  const snapshotIso = snapshot.toISOString();
  const cutoffIso = new Date(snapshot.getTime() - q.since_hours * 3_600_000).toISOString();

  const filtered = (count = false) => {
    let query = createClient()
      .schema("ops")
      .from("system_error")
      .select(COLUMNS, count ? { count: "exact" } : undefined)
      .gt("occurred_at", cutoffIso)
      .lte("created_at", snapshotIso);
    if (q.kind) query = query.eq("kind", q.kind);
    if (q.request_id) query = query.eq("request_id", q.request_id);
    if (q.unresolved_only)
      query = query.or(`resolved_at.is.null,resolved_at.gt.${snapshotIso}`);
    return query;
  };

  // The total counts the whole frozen window, before the cursor narrows it. It is counted
  // ONCE (the first page); every following page carries it.
  let total = q.total ?? 0;
  if (q.total === undefined) {
    const counted = await filtered(true).limit(0);
    if (counted.error) throw new Error(counted.error.message);
    total = counted.count ?? 0;
  }

  let page = filtered();
  if (q.cursor_occurred_at && q.cursor_id) {
    page = page.or(
      `occurred_at.lt.${q.cursor_occurred_at},and(occurred_at.eq.${q.cursor_occurred_at},id.lt.${q.cursor_id})`,
    );
  }
  const { data, error } = await page
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(q.limit + 1);
  if (error) throw new Error(error.message);

  const fetched = (data ?? []) as unknown as SystemErrorRow[];
  const hasNext = fetched.length > q.limit;
  const errors = fetched.slice(0, q.limit);
  const last = errors[errors.length - 1];

  const summary = [`occurred_at > ${cutoffIso}`, `snapshot_at=${snapshotIso}`];
  if (q.kind) summary.push(`kind=${q.kind}`);
  if (q.request_id) summary.push(`request_id=${q.request_id}`);
  if (q.unresolved_only) summary.push("unresolved_only=true");
  summary.push(`limit=${q.limit}`);

  return {
    errors,
    count: errors.length,
    total,
    limit: q.limit,
    snapshot_at: snapshotIso,
    next_cursor_occurred_at: hasNext ? (last?.occurred_at ?? null) : null,
    next_cursor_id: hasNext && last ? String(last.id) : null,
    filter_summary: summary.join(" ; "),
  };
}
