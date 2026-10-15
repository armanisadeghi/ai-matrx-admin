"use client";

// Users & Access › Support sessions — every support session, newest first, with its trail.
// "Also signed in" is the most live sign-ins the person held at any point of the session
// (start, each extension, end), so who did what can always be rebuilt.

import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, X } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { Badge, Button, type BadgeTone } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { AdminUserRef } from "../components/AdminUserRef";
import {
  endSupportSession,
  listSupportSessions,
  type SupportSessionEvent,
  type SupportSessionRow,
} from "./service";

type Row = SupportSessionRow & {
  trail: SupportSessionEvent[];
  also_signed_in: number;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "warning",
  pending: "info",
  claiming: "info",
  ended: "neutral",
};

const END_REASON: Record<string, string> = {
  ended_in_session: "Ended in session",
  ended_by_admin: "Ended by admin",
  expired: "Ran out of time",
  link_expired: "Link never opened",
  sign_in_failed: "Sign-in failed",
};

function time(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function toRow(row: SupportSessionRow): Row {
  const trail = Array.isArray(row.events) ? (row.events as unknown as SupportSessionEvent[]) : [];
  return {
    ...row,
    trail,
    also_signed_in: trail.reduce((max, e) => Math.max(max, e.target_live_sign_ins ?? 0), 0),
  };
}

function trailText(trail: SupportSessionEvent[]): string {
  return trail
    .map((e) => `${e.event} ${new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`)
    .join(" · ");
}

const COLUMNS: MatrxColumnDef<Row>[] = [
  {
    id: "target_email",
    accessorKey: "target_email",
    header: "Person",
    width: 200,
    cell: (r) => <AdminUserRef userId={r.target_user_id} />,
  },
  {
    id: "admin_email",
    accessorKey: "admin_email",
    header: "Admin",
    width: 180,
    cell: (r) => <AdminUserRef userId={r.admin_user_id} />,
  },
  { id: "reason", accessorKey: "reason", header: "Reason", width: 220 },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    filter: "select",
    width: 100,
    cell: (r) => <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>,
  },
  {
    id: "started_at",
    accessorKey: "started_at",
    header: "Started",
    width: 170,
    cell: (r) => <span className="text-xs">{time(r.started_at)}</span>,
  },
  {
    id: "ended_at",
    accessorKey: "ended_at",
    header: "Ended",
    width: 170,
    cell: (r) => <span className="text-xs">{r.status === "ended" ? time(r.ended_at) : `ends ${time(r.expires_at)}`}</span>,
  },
  {
    id: "end_reason",
    accessorKey: "end_reason",
    header: "How it ended",
    filter: "select",
    width: 140,
    cell: (r) => <span className="text-xs">{r.end_reason ? (END_REASON[r.end_reason] ?? r.end_reason) : "—"}</span>,
  },
  {
    id: "also_signed_in",
    accessorKey: "also_signed_in",
    header: "Also signed in",
    align: "center",
    width: 110,
    cell: (r) => <span className="text-xs">{r.also_signed_in > 0 ? `Yes (${r.also_signed_in})` : "No"}</span>,
  },
  {
    id: "trail",
    accessorFn: (r) => trailText(r.trail),
    header: "Trail",
    width: 280,
    cell: (r) => <span className="text-xs text-muted-foreground">{trailText(r.trail)}</span>,
  },
  { id: "support_ip", accessorKey: "support_ip", header: "Support IP", width: 120 },
];

export function SupportSessionsTableClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [ending, setEnding] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows((await listSupportSessions()).map(toRow));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const end = async (row: Row) => {
    const ok = await confirm({
      title: "End this support session?",
      description: `The support window for ${row.target_email ?? "this person"} signs out now.`,
      confirmLabel: "End session",
      variant: "destructive",
    });
    if (!ok) return;
    setEnding(row.id);
    try {
      await endSupportSession(row.id);
      toast.success("Support session ended");
      await load();
    } catch (e) {
      toast.error(`Could not end it: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEnding(null);
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="min-h-0 flex-1">
        <MatrxDataTable
          urlState={{ id: "support-sessions" }}
          data={rows}
          columns={[
            ...COLUMNS,
            {
              id: "custom-actions",
              header: "",
              sortable: false,
              filter: false,
              customActions: (row) =>
                row.status === "ended" ? null : (
                  <Button
                    variant="quiet"
                    icon={<X />}
                    aria-label="End session"
                    title="End session"
                    disabled={ending === row.id}
                    onClick={() => void end(row)}
                  />
                ),
            },
          ]}
          getRowId={(r) => r.id}
          isLoading={loading}
          pageSize={50}
          read={readOf({ loading, error }, { what: "support sessions", onRetry: () => void load() })}
          emptyState={{
            title: "No support sessions yet",
            description: "Start one from a person's menu on Accounts.",
            icon: <LifeBuoy className="h-6 w-6 text-muted-foreground" />,
          }}
          toolbar={{ search: true, searchPlaceholder: "Search support sessions…" }}
        />
      </div>
    </div>
  );
}
