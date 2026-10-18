"use client";

// A person's Support tab: their support sessions (the Support sessions table, narrowed by prop),
// Start support session (the page's one dispatch), and the feedback they filed
// (users.user_feedback by user_id) — each row opens its record in the feedback console.

import { useEffect, useState } from "react";
import { useRecordLoad } from "./useRecordLoad";
import { LifeBuoy, MessageSquareWarning } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import AppLink from "@/components/navigation/AppLink";
import { createClient } from "@/utils/supabase/client";
import { feedbackHref } from "@/features/admin/feedback/doors";
import { SupportSessionsTableClient } from "../support-sessions/SupportSessionsTableClient";
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

const FEEDBACK_CAP = 200;

/** The newest FEEDBACK_CAP items plus the full count, so a cut list says so (F8). */
async function listFeedbackBy(userId: string): Promise<{ rows: FeedbackRow[]; total: number }> {
  const { data, error, count } = await createClient()
    .schema("users")
    .from("user_feedback")
    .select("id, feedback_type, status, description, route, priority, created_at", { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(FEEDBACK_CAP);
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({ ...r, priority: r.priority === null ? null : String(r.priority) }));
  return { rows, total: count ?? rows.length };
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

export function UserSupportTab({ userId, version: pageVersion, reload, actions, subject, shareForAi }: UserTabBodyProps) {
  const [version, setVersion] = useState(0);
  // Start support session is the page's one action (its dialog reloads the page when it closes).
  const blocked = actions.blockedReason("support_session", subject);

  const { data: feedbackData, loading, error } = useRecordLoad(listFeedbackBy, userId, pageVersion + version);
  const feedback = feedbackData?.rows ?? [];
  const feedbackTotal = feedbackData?.total ?? 0;
  useEffect(() => shareForAi({ feedback }), [feedback, shareForAi]);

  return (
    <div className="flex flex-col gap-5" data-testid="user-support-tab">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="type-title">Support sessions</h3>
          <Button
            variant="outline"
            icon={<LifeBuoy />}
            disabled={blocked !== null}
            title={blocked ?? undefined}
            onClick={() => actions.run("support_session", subject)}
          >
            Start support session
          </Button>
        </div>
        <SupportSessionsTableClient targetUserId={userId} reloadKey={pageVersion} onChanged={reload} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="type-title">Feedback filed</h3>
          {!error && feedbackTotal > feedback.length ? (
            <span className="type-secondary text-muted-foreground">
              Showing {formatCount(feedback.length)} of {formatCount(feedbackTotal)}
            </span>
          ) : null}
        </div>
        <MatrxDataTable
          data={feedback}
          columns={FEEDBACK_COLUMNS}
          getRowId={(r) => r.id}
          isLoading={loading}
          pageSize={25}
          read={readOf({ loading, error }, { what: "feedback", onRetry: () => setVersion((v) => v + 1) })}
          emptyState={{
            title: "No feedback filed",
            icon: <MessageSquareWarning className="h-6 w-6 text-muted-foreground" />,
          }}
          toolbar={{ search: true, searchPlaceholder: "Search feedback…" }}
        />
      </section>
    </div>
  );
}
