"use client";

// A person's Admin history tab: every admin action ON this person — admin.admin_audit_log
// (target_user_id = person; written inside each action's SQL function / server route, reason in
// metadata.reason) merged with iam.org_admin_audit (organization admin actions; reason in
// detail.reason), newest first. Actor words come from the batched admin label lookup so the
// column sorts and filters by name.

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { createClient } from "@/utils/supabase/client";
import { isJsonObject, type Json } from "@/types/json";
import { AdminUserRef } from "../components/AdminUserRef";
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

function actionWords(action: string): string {
  return action.replace(/[._]/g, " ");
}

/** Both audit sources for one person, merged newest first, actors named. */
export async function listUserAdminHistory(userId: string, limit = 500): Promise<HistoryRow[]> {
  const supabase = createClient();
  const [platform, org] = await Promise.all([
    supabase
      .schema("admin")
      .from("admin_audit_log")
      .select("id, created_at, action, actor_user_id, before, after, metadata, organization_id")
      .eq("target_user_id", userId)
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
  if (failed) throw new Error(failed.message);
  const rows: HistoryRow[] = [
    ...(platform.data ?? []).map((r) => ({
      id: `p:${r.id}`,
      at: r.created_at,
      source: "Platform" as const,
      action: actionWords(r.action),
      actor_id: r.actor_user_id,
      actor: "",
      reason: reasonOf(r.metadata, r.after),
      organization_id: r.organization_id,
      before: r.before,
      after: r.after,
    })),
    ...(org.data ?? []).map((r) => ({
      id: `o:${r.id}`,
      at: r.created_at,
      source: "Organization" as const,
      action: actionWords(r.action),
      actor_id: r.actor_user_id,
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
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

function changedKeys(before: Json | null, after: Json | null): string[] {
  const b = isJsonObject(before) ? before : {};
  const a = isJsonObject(after) ? after : {};
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}

function DiffCell({ row }: { row: HistoryRow }) {
  if (row.before === null && row.after === null) return <span className="text-muted-foreground">—</span>;
  const keys = changedKeys(row.before, row.after);
  return (
    <details className="type-secondary">
      <summary data-clickable="" className="truncate">
        {keys.length ? keys.slice(0, 4).join(", ") + (keys.length > 4 ? ` +${keys.length - 4}` : "") : "details"}
      </summary>
      <div className="mt-1 grid gap-1 font-mono type-meta">
        {row.before !== null ? <pre className="whitespace-pre-wrap break-all">before {JSON.stringify(row.before, null, 1)}</pre> : null}
        <pre className="whitespace-pre-wrap break-all">after {JSON.stringify(row.after, null, 1)}</pre>
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

export function UserHistoryTab({ userId }: UserTabBodyProps) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listUserAdminHistory(userId)
      .then((list) => {
        if (!alive) return;
        setRows(list);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId, version]);

  return (
    <div data-testid="user-history-tab">
      <MatrxDataTable
        data={rows}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        isLoading={loading}
        pageSize={50}
        read={readOf({ loading, error }, { what: "admin history", onRetry: () => setVersion((v) => v + 1) })}
        emptyState={{
          title: "No admin actions yet",
          description: "Nothing has been done to this account by an admin.",
          icon: <History className="h-6 w-6 text-muted-foreground" />,
        }}
        toolbar={{ search: true, searchPlaceholder: "Search history…" }}
      />
    </div>
  );
}
