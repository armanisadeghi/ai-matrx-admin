"use client";

// A person's Admin history tab: every admin action ON this person — admin.admin_audit_log
// (target_user_id = person; written inside each action's SQL function / server route, reason in
// metadata.reason) merged with iam.org_admin_audit (organization admin actions; reason in
// detail.reason), newest first. Actor words come from the batched admin label lookup so the
// column sorts and filters by name.

import { useEffect, useState } from "react";
import { useRecordLoad } from "./useRecordLoad";
import { History } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { createClient } from "@/utils/supabase/client";
import { isJsonObject } from "@/types/json";
import type { Json } from "@/types/database.types";
import { AdminUserRef } from "../components/AdminUserRef";
import { adminActionWords } from "../lib/adminActionWords";
import { resolveAdminUserLabels } from "../useAdminUserLabel";
import { adminOrganizationHref } from "./UserOrganizationsTab";
import AppLink from "@/components/navigation/AppLink";
import type { UserTabBodyProps } from "./UserRecordPage";

export interface HistoryRow {
  id: string;
  at: string;
  source: "Platform" | "Organization";
  action: string;
  actor_id: string | null;
  actor: string;
  reason: string;
  organization_id: string | null;
  before: Json | null;
  after: Json | null;
}

function reasonOf(...bags: (Json | null | undefined)[]): string {
  for (const bag of bags) {
    if (isJsonObject(bag) && typeof bag.reason === "string" && bag.reason.trim()) return bag.reason.trim();
    if (isJsonObject(bag) && typeof bag.note === "string" && bag.note.trim()) return bag.note.trim();
  }
  return "";
}

/** metadata.operation names what a generic "update" row did (e.g. email_verified). */
function operationOf(metadata: Json | null | undefined): string | null {
  return isJsonObject(metadata) && typeof metadata.operation === "string" ? metadata.operation : null;
}

/** The organization an org-scoped platform row is about (memberships); a platform row's own
 * organization_id is always the Matrx System tenant, so it is never linked (F6). */
function metadataOrganization(metadata: Json | null | undefined): string | null {
  return isJsonObject(metadata) && typeof metadata.organization_id === "string" ? metadata.organization_id : null;
}

/** metadata.admin_user_id names the admin on rows whose actor column is empty (support sessions). */
function metadataActor(metadata: Json | null | undefined): string | null {
  return isJsonObject(metadata) && typeof metadata.admin_user_id === "string" ? metadata.admin_user_id : null;
}

export interface HistoryPage {
  rows: HistoryRow[];
  /** A source returned its full window: older rows exist (the tab offers Load older). */
  more: boolean;
}

export const HISTORY_PAGE = 200;

/** Both audit sources for one person, merged newest first, actors named. */
export async function listUserAdminHistory(userId: string, limit = HISTORY_PAGE): Promise<HistoryPage> {
  const supabase = createClient();
  const [platform, org] = await Promise.all([
    supabase
      .schema("admin")
      .from("admin_audit_log")
      .select("id, created_at, action, actor_user_id, before, after, metadata, organization_id")
      .eq("target_user_id", userId)
      // admin_lane_* rows record an admin's OWN seat being admitted (target = the admin), not an
      // action on this person; they would bury every real action.
      .not("action", "like", "admin_lane_%")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .schema("iam")
      .from("org_admin_audit")
      .select("id, created_at, action, actor_user_id, detail, metadata, organization_id")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  const failed = platform.error ?? org.error;
  if (failed) throw failed;
  const rows: HistoryRow[] = [
    ...(platform.data ?? []).map((r) => ({
      id: `p:${r.id}`,
      at: r.created_at,
      source: "Platform" as const,
      action: adminActionWords(operationOf(r.metadata) ?? r.action),
      actor_id: r.actor_user_id ?? metadataActor(r.metadata),
      actor: "",
      reason: reasonOf(r.metadata, r.after),
      organization_id: metadataOrganization(r.metadata),
      before: r.before,
      after: r.after,
    })),
    // A super-admin membership change writes BOTH audits in one transaction; the platform row is the
    // canonical one, so its org twin (same instant, same verb) is skipped — one event, one row (F4).
    ...(org.data ?? []).filter((r) => {
      if (!r.action.startsWith("super_admin_membership_")) return true;
      const verb = `org_membership_${r.action.slice("super_admin_membership_".length)}`;
      return !(platform.data ?? []).some((p) => p.action === verb && p.created_at === r.created_at);
    }).map((r) => ({
      id: `o:${r.id}`,
      at: r.created_at,
      source: "Organization" as const,
      action: adminActionWords(r.action),
      actor_id: r.actor_user_id ?? metadataActor(r.metadata),
      actor: "",
      reason: reasonOf(r.detail, r.metadata),
      organization_id: r.organization_id,
      before: null,
      after: r.detail,
    })),
  ];
  const labels = await resolveAdminUserLabels(rows.map((r) => r.actor_id ?? "").filter(Boolean));
  for (const r of rows) {
    r.actor = r.actor_id ? (labels.get(r.actor_id)?.label ?? r.actor_id) : "System";
  }
  const more = (platform.data ?? []).length >= limit || (org.data ?? []).length >= limit;
  return { rows: rows.sort((a, b) => b.at.localeCompare(a.at)), more };
}

// Stable fetchers, one per window size (useRecordLoad wants a stable function).
const BY_LIMIT = new Map<number, (userId: string) => Promise<HistoryPage>>();
function historyFor(limit: number): (userId: string) => Promise<HistoryPage> {
  let fetcher = BY_LIMIT.get(limit);
  if (!fetcher) {
    fetcher = (userId: string) => listUserAdminHistory(userId, limit);
    BY_LIMIT.set(limit, fetcher);
  }
  return fetcher;
}

function changedKeys(before: Json | null, after: Json | null): string[] {
  const b = isJsonObject(before) ? before : {};
  const a = isJsonObject(after) ? after : {};
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}

function shortValue(value: Json | undefined): string {
  if (value === undefined || value === null) return "none";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

/** "field: old → new" for each changed key (readable words, no JSON). */
export function changeLines(before: Json | null, after: Json | null): string[] {
  const b = isJsonObject(before) ? before : {};
  const a = isJsonObject(after) ? after : {};
  return changedKeys(before, after).map(
    (k) => `${k.replace(/_/g, " ")}: ${shortValue(b[k] as Json | undefined)} → ${shortValue(a[k] as Json | undefined)}`,
  );
}

function DiffCell({ row }: { row: HistoryRow }) {
  if (row.before === null && row.after === null) return <span className="text-muted-foreground">—</span>;
  const lines = changeLines(row.before, row.after);
  return (
    <details className="type-secondary">
      <summary data-clickable="" className="truncate">
        {lines.length ? lines[0] + (lines.length > 1 ? ` +${lines.length - 1} more` : "") : "details"}
      </summary>
      <div className="mt-1 grid gap-1">
        {lines.slice(1).map((line) => (
          <span key={line} className="break-all">
            {line}
          </span>
        ))}
        <div className="grid gap-1 font-mono type-meta text-muted-foreground">
          {row.before !== null ? <pre className="whitespace-pre-wrap break-all">before {JSON.stringify(row.before, null, 1)}</pre> : null}
          <pre className="whitespace-pre-wrap break-all">after {JSON.stringify(row.after, null, 1)}</pre>
        </div>
      </div>
    </details>
  );
}

const COLUMNS: MatrxColumnDef<HistoryRow>[] = [
  { id: "at", accessorKey: "at", header: "When", format: { id: "datetime" }, width: 170 },
  {
    id: "actor",
    accessorKey: "actor",
    header: "Who",
    width: 200,
    cell: (r) => (r.actor_id ? <AdminUserRef userId={r.actor_id} name={r.actor} hideEmail /> : <span>{r.actor}</span>),
  },
  { id: "action", accessorKey: "action", header: "Action", filter: "select", width: 200 },
  { id: "reason", accessorKey: "reason", header: "Reason", width: 260 },
  {
    id: "source",
    accessorKey: "source",
    header: "Source",
    filter: "select",
    width: 120,
    cell: (r) =>
      r.organization_id ? (
        <AppLink href={adminOrganizationHref(r.organization_id)} className="hover:text-primary">
          {r.source}
        </AppLink>
      ) : (
        <span>{r.source}</span>
      ),
  },
  {
    id: "diff",
    accessorFn: (r) => changedKeys(r.before, r.after).join(", "),
    header: "Change",
    width: 280,
    cell: (r) => <DiffCell row={r} />,
  },
];

export function UserHistoryTab({ userId, version: pageVersion, shareForAi }: UserTabBodyProps) {
  const [version, setVersion] = useState(0);
  const [limit, setLimit] = useState(HISTORY_PAGE);

  const { data, loading, error } = useRecordLoad(historyFor(limit), userId, `${pageVersion + version}:${limit}`);
  const rows = data?.rows ?? [];
  useEffect(() => shareForAi({ history: rows }), [rows, shareForAi]);

  return (
    <div className="flex flex-col gap-2" data-testid="user-history-tab">
      <MatrxDataTable
        data={rows}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        isLoading={loading && !data}
        pageSize={50}
        read={readOf({ loading: loading && !data, error }, { what: "admin history", onRetry: () => setVersion((v) => v + 1) })}
        emptyState={{
          title: "No admin actions yet",
          icon: <History className="h-6 w-6 text-muted-foreground" />,
        }}
        toolbar={{ search: true, searchPlaceholder: "Search history…" }}
      />
      {data?.more ? (
        <div>
          <Button variant="outline" disabled={loading} onClick={() => setLimit((n) => n + HISTORY_PAGE)}>
            Load older
          </Button>
        </div>
      ) : null}
    </div>
  );
}
