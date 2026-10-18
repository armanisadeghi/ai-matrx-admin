"use client";

// A person's Support tab: their support sessions (the Support sessions table, narrowed by prop),
// Start support session (the existing dialog), and the feedback they filed
// (users.user_feedback by user_id) — each row opens its record in the feedback console.

import { useEffect, useState } from "react";
import { LifeBuoy, MessageSquareWarning } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import AppLink from "@/components/navigation/AppLink";
import { createClient } from "@/utils/supabase/client";
import { feedbackHref } from "@/features/admin/feedback/doors";
import { SupportSessionsTableClient } from "../support-sessions/SupportSessionsTableClient";
import { StartSupportSessionDialog, type SupportSessionTarget } from "../support-sessions/StartSupportSessionDialog";
import { realName } from "./userOverview";
import type { UserTabBodyProps } from "./UserRecordPage";

interface FeedbackRow {
  id: string;
  feedback_type: string;
  status: string;
  description: string;
  route: string | null;
  priority: string | null;
  created_at: string;
}

async function listFeedbackBy(userId: string): Promise<FeedbackRow[]> {
  const { data, error } = await createClient()
    .schema("users")
    .from("user_feedback")
    .select("id, feedback_type, status, description, route, priority, created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, priority: r.priority === null ? null : String(r.priority) }));
}

const FEEDBACK_COLUMNS: MatrxColumnDef<FeedbackRow>[] = [
  { id: "created_at", accessorKey: "created_at", header: "Filed", format: { id: "datetime" }, width: 170 },
  {
    id: "description",
    accessorKey: "description",
    header: "Feedback",
    width: 360,
    cell: (r) => (
      <AppLink href={feedbackHref(r.id)} className="line-clamp-1 hover:text-primary">
        {r.description || "Untitled"}
      </AppLink>
    ),
  },
  { id: "feedback_type", accessorKey: "feedback_type", header: "Type", filter: "select", width: 110 },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    filter: "select",
    width: 140,
    cell: (r) => <Badge tone={r.status === "resolved" || r.status === "closed" ? "neutral" : "info"}>{r.status.replace(/_/g, " ")}</Badge>,
  },
  { id: "priority", accessorFn: (r) => r.priority ?? "", header: "Priority", filter: "select", width: 100 },
  { id: "route", accessorFn: (r) => r.route ?? "", header: "Route", width: 220 },
];

export function UserSupportTab({ userId, overview, reload }: UserTabBodyProps) {
  const [target, setTarget] = useState<SupportSessionTarget | null>(null);
  const [sessionsKey, setSessionsKey] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const contactable = Boolean(overview.identity.email) && !overview.identity.is_anonymous;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listFeedbackBy(userId)
      .then((rows) => {
        if (!alive) return;
        setFeedback(rows);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId, version]);

  return (
    <div className="flex flex-col gap-5" data-testid="user-support-tab">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="type-title">Support sessions</h3>
          <Button
            variant="outline"
            icon={<LifeBuoy />}
            disabled={!contactable}
            onClick={() => setTarget({ id: userId, email: overview.identity.email, displayName: realName(overview.identity.display_name) })}
          >
            Start support session
          </Button>
        </div>
        <SupportSessionsTableClient targetUserId={userId} reloadKey={sessionsKey} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="type-title">Feedback filed</h3>
        <MatrxDataTable
          data={feedback}
          columns={FEEDBACK_COLUMNS}
          getRowId={(r) => r.id}
          isLoading={loading}
          pageSize={25}
          read={readOf({ loading, error }, { what: "feedback", onRetry: () => setVersion((v) => v + 1) })}
          emptyState={{
            title: "No feedback filed",
            description: "This person has not sent feedback.",
            icon: <MessageSquareWarning className="h-6 w-6 text-muted-foreground" />,
          }}
          toolbar={{ search: true, searchPlaceholder: "Search feedback…" }}
        />
      </section>

      <StartSupportSessionDialog
        target={target}
        onClose={() => {
          setTarget(null);
          setSessionsKey((k) => k + 1);
          reload();
        }}
      />
    </div>
  );
}
