"use client";

// A person's Support tab: their support sessions (the Support sessions table, narrowed by prop),
// Start support session (the page's one dispatch), and the feedback they filed
// (users.user_feedback by user_id) — each row opens its record in the feedback console.
// An organization's seat (tab label "Feedback") sees only the feedback they filed in that
// organization (iam.org_admin_member_feedback); support sessions are platform staff's, so not here.

import { useEffect, useMemo, useState } from "react";
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
import type { ScopedTabBodyProps } from "./UserRecordPage";
import type { UserRecordScope } from "./userSurfaces";

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

/** The feedback they filed in one organization, newest FEEDBACK_CAP plus the full count. */
async function listOrganizationFeedbackBy(orgId: string, userId: string): Promise<{ rows: FeedbackRow[]; total: number }> {
  const { data, error } = await createClient()
    .schema("iam")
    .rpc("org_admin_member_feedback", { p_org_id: orgId, p_user_id: userId, p_limit: FEEDBACK_CAP });
  if (error) throw error;
  const rows = (data ?? []).map(({ total: _total, ...r }) => r);
  return { rows, total: Number(data?.[0]?.total ?? 0) };
}

function feedbackColumns(scope: UserRecordScope): MatrxColumnDef<FeedbackRow>[] {
  return [
  { id: "created_at", accessorKey: "created_at", header: "Filed", format: { id: "datetime" }, width: 170 },
  {
    id: "description",
    accessorKey: "description",
    header: "Feedback",
    width: 360,
    // data-kind-source: the person's own words, verbatim (they can name a kind key; that is their text, not a leak).
    // The feedback console is the platform's; an organization's seat reads the words here.
    cell: (r) =>
      scope.kind === "platform" ? (
        <AppLink href={feedbackHref(r.id)} data-kind-source="explicit" className="line-clamp-1 hover:text-primary">
          {r.description || "Untitled"}
        </AppLink>
      ) : (
        <span data-kind-source="explicit" className="line-clamp-1">{r.description || "Untitled"}</span>
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
}

export function UserSupportTab({ userId, scope, version: pageVersion, reload, actions, subject, shareForAi }: ScopedTabBodyProps) {
  const [version, setVersion] = useState(0);
  // Start support session is the platform page's one action (its dialog reloads the page when it closes).
  const support = scope.kind === "platform" && actions && subject ? { actions, subject } : null;
  const blocked = support ? support.actions.blockedReason("support_session", support.subject) : null;

  const fetcher = useMemo(
    () => (scope.kind === "organization" ? (id: string) => listOrganizationFeedbackBy(scope.orgId, id) : listFeedbackBy),
    [scope],
  );
  const columns = useMemo(() => feedbackColumns(scope), [scope]);
  const { data: feedbackData, loading, error } = useRecordLoad(fetcher, userId, pageVersion + version);
  const feedback = feedbackData?.rows ?? [];
  const feedbackTotal = feedbackData?.total ?? 0;
  useEffect(() => shareForAi({ feedback }), [feedback, shareForAi]);

  return (
    <div className="flex flex-col gap-5" data-testid="user-support-tab">
      {support ? (
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="type-title">Support sessions</h3>
          <Button
            variant="outline"
            icon={<LifeBuoy />}
            disabled={blocked !== null}
            title={blocked ?? undefined}
            onClick={() => support.actions.run("support_session", support.subject)}
          >
            Start support session
          </Button>
        </div>
        <SupportSessionsTableClient targetUserId={userId} reloadKey={pageVersion} onChanged={reload} />
      </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="type-title">{scope.kind === "organization" ? `Feedback filed in ${scope.orgName}` : "Feedback filed"}</h3>
          {!error && feedbackTotal > feedback.length ? (
            <span className="type-secondary text-muted-foreground">
              Showing {formatCount(feedback.length)} of {formatCount(feedbackTotal)}
            </span>
          ) : null}
        </div>
        <MatrxDataTable
          data={feedback}
          columns={columns}
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
