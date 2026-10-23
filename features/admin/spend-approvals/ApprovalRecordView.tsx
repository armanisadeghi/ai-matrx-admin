"use client";

/**
 * ONE spend approval as its own page (Arman, 2026-10-17): the record route
 * `/administration/billing/approvals/<kind>/<subjectId>`, drawn beside the approvals list (the
 * route's layout turns the list into this page's sidebar). Its decision first, then what it
 * costs, what it is, and its history and held runs.
 *
 * The route is the SUBJECT, not the row id: every subject has one live approval, and duplicate
 * rows are merged away (`billing.run_approval_subject_uq`), so a link to the subject never dies.
 * An old link to a merged row lands here with `?replaced=<id>` and says so.
 */
import Link from "@/components/navigation/AppLink";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hammer, ScrollText } from "lucide-react";
import { INTELLIGENCE_ICON } from "@/components/icons/domain-icons";
import { ReadGate } from "@ai-matrx/design-system";
import { EmptyState, PropertyRow, CalloutBanner } from "@ai-matrx/design-system/controls";
import { carryTableViewParams } from "@ai-matrx/design-system/data-table";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { RecordPageHeader, type RecordPageAction } from "@/features/shell/components/header/templates/RecordPageHeader";
import { agentBuildHref } from "@/features/admin/held-runs/heldRuns";
import { ApprovalEditBody } from "./ApprovalEditBody";
import { DecisionDialog, HistoryList, spendApprovalsTableId, type Pending } from "./SpendApprovalsBoard";
import { HeldRunsList } from "./SubjectApprovalsPanel";
import { useSpendApprovalsData } from "./useSpendApprovalsData";
import { SIBLINGS_MAX } from "@/features/shell/breadcrumbs/record-siblings";
import { spendApprovalSurfaceRow } from "./spendApprovalSurface";
import { useSurfaceRuntimeRegistration } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { ADMIN_SPEND_APPROVAL_SURFACE_NAME } from "@/features/surfaces/manifests/admin-spend-approval.manifest";
import {
  APPROVAL_STATUS_LABEL,
  COVERED_LABEL,
  SPEND_APPROVALS_ADMIN_PATH,
  SUBJECT_KIND_LABEL,
  approvalRecordHref,
  approvalSubjectHref,
  firstRunHref,
  isCovered,
  mandateKeyHref,
  orgSpendApprovalsPath,
  rowMatchesSubject,
  startedByLabel,
  useApprovalColorKnobs,
  type ApprovalSeat,
  type ApprovalStatus,
  type ApprovalSubject,
  type SpendApprovalRow,
} from "./spendApprovals";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : undefined);
const usd = (value: number | null | undefined) => (value == null ? undefined : formatAdminUsd(value));

const STATUS_TONE: Record<ApprovalStatus, "warning" | "success" | "info" | "destructive"> = {
  waiting: "warning",
  approved: "success",
  temporary: "info",
  rejected: "destructive",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card px-3 py-2">
      <h2 className="pb-1 type-label text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function ApprovalRecordView({
  subject,
  seat,
  orgId = null,
  orgSlug,
}: {
  subject: ApprovalSubject;
  seat: ApprovalSeat;
  orgId?: string | null;
  orgSlug?: string;
}) {
  const { rows, loading, error, decide, reload } = useSpendApprovalsData(orgId);
  const knobs = useApprovalColorKnobs();
  const [pending, setPending] = useState<Pending | null>(null);
  const params = useSearchParams();
  const replaced = params.get("replaced");
  // Back to the list keeps the view the person came from (its search, sort, filters, status).
  const listHref = carryTableViewParams(
    seat === "org" && orgSlug ? orgSpendApprovalsPath(orgSlug) : SPEND_APPROVALS_ADMIN_PATH,
    params.toString(),
    spendApprovalsTableId(seat),
  );
  const row = rows.find((r) => r.subject_kind === subject.kind && r.subject_id === subject.id) ?? null;
  // The record's door: the other approvals — the list's own rows, already read for this page.
  const siblings = rows.slice(0, SIBLINGS_MAX).map((r) => ({
    label: r.subject_name || r.subject_id,
    href: approvalRecordHref(r.subject_kind, r.subject_id, seat, orgSlug),
    active: r === row,
  }));
  const related = row ? rows.filter((r) => r.id !== row.id && rowMatchesSubject(r, subject)) : [];
  const kindLabel = SUBJECT_KIND_LABEL[subject.kind] ?? subject.kind;

  // Surface `matrx-admin/spend-approval` (admin seat only): the record as shown; a decision is
  // only OPENED in the page's own dialog, the person presses.
  const proposable = (value: unknown): "approve" | "approve_temporary" | "reject" | "reopen" | null =>
    value === "approve" || value === "approve_temporary" || value === "reject" || value === "reopen" ? value : null;
  useSurfaceRuntimeRegistration(
    seat === "admin"
      ? {
          surfaceName: ADMIN_SPEND_APPROVAL_SURFACE_NAME,
          getScope: () =>
            ({
              subject_kind: subject.kind,
              subject_id: subject.id,
              approval_load_status: loading ? "loading" : error ? "failed" : row ? "loaded" : "none",
              approval: row ? spendApprovalSurfaceRow(row) : undefined,
              related_approvals: related.map((r) => ({
                id: r.id,
                subject_name: r.subject_name ?? r.subject_id,
                kind_label: SUBJECT_KIND_LABEL[r.subject_kind],
                status_label: APPROVAL_STATUS_LABEL[r.status],
              })),
            }) as SurfaceScopePayload,
          getWriteHandlers: () => ({
            propose_decision: {
              validate: (value: unknown) => {
                if (!row) refuseSurfaceWrite("There is no approval on this page.");
                if (!row.can_decide) refuseSurfaceWrite("This approval cannot be decided from this seat.");
                if (!proposable(value)) refuseSurfaceWrite('Send "approve", "approve_temporary", "reject" or "reopen".');
              },
              apply: (value: unknown) => {
                const decision = proposable(value);
                if (!row || !decision) refuseSurfaceWrite("There is no decision to open.");
                setPending({ row, decision });
                return { summary: "The decision dialog is open; nothing is decided until the person presses it." };
              },
            },
          }),
        }
      : null,
  );

  const header = (name: string, r: SpendApprovalRow | null) => {
    const actions: RecordPageAction[] = [];
    if (r) {
      const own = approvalSubjectHref(r.subject_kind, r.subject_id, seat, orgSlug);
      if (own !== approvalRecordHref(r.subject_kind, r.subject_id, seat, orgSlug)) {
        actions.push({ label: `Open ${kindLabel.toLowerCase()}`, icon: ScrollText, href: own, showLabel: true });
      }
      if (r.agent_id && seat === "admin") actions.push({ label: "Agent build", icon: Hammer, href: agentBuildHref(r.agent_id) });
      if (r.feature_mandate_key) actions.push({ label: "Mandate", icon: INTELLIGENCE_ICON, href: mandateKeyHref(r.feature_mandate_key, seat, orgSlug) });
    }
    return (
      <RecordPageHeader
        backHref={listHref}
        parents={[
          ...(seat === "admin" ? [{ label: "Billing", href: "/administration/billing" }] : []),
          { label: "Spend approvals", href: listHref },
        ]}
        record={{ name, siblings }}
        {...(r ? { status: isCovered(r) ? { label: COVERED_LABEL, tone: "success" as const } : { label: APPROVAL_STATUS_LABEL[r.status], tone: STATUS_TONE[r.status] } } : {})}
        actions={actions}
      />
    );
  };

  if (!row) {
    return (
      <>
        {header(subject.id, null)}
        <div className="p-4">
          <ReadGate
            status={loading ? "loading" : error ? "error" : "ready"}
            error={error}
            what="spend approvals"
            onRetry={reload}
            isEmpty
            loading={<div className="h-64 animate-pulse rounded-lg bg-muted/50" />}
            empty={
              <EmptyState
                icon={<ScrollText className="h-5 w-5" />}
                title={`No spend approval for this ${kindLabel.toLowerCase()}`}
                line={subject.id}
                action={<Link className="text-primary hover:underline" href={listHref}>All spend approvals</Link>}
              />
            }
          >
            {null}
          </ReadGate>
        </div>
      </>
    );
  }

  const name = row.subject_name ?? row.subject_id;
  const runHref = firstRunHref(row, seat);
  return (
    <>
      {header(name, row)}
      <div className="flex flex-col gap-3 p-3" data-testid="approval-record" data-approval-id={row.id}>
        {replaced && replaced !== row.id ? (
          <CalloutBanner
            tone="info"
            title={`Approval ${replaced.slice(0, 8)} was merged into this one`}
            description="Old links to it now open here."
          />
        ) : null}
        <Section title="Decision">
          <ApprovalEditBody
            row={row}
            onDecide={(decision, next, note, expiresAt) => decide(row, decision, next, note, expiresAt)}
            onAction={(decision) => setPending({ row, decision })}
          />
        </Section>
        <Section title="Spend">
          <Facts>
            <PropertyRow label="Cost per automated run" value={usd(row.automated_cost_per_run)} missing={row.automated_cost_per_run == null} />
            <PropertyRow label="Automated cost (30d)" value={usd(row.automated_cost_30d)} />
            <PropertyRow label="Est./month" value={usd(row.est_monthly_cost)} missing={row.est_monthly_cost == null ? "Not run since reset" : false} />
            <PropertyRow label="Avg cost since" value={usd(row.avg_cost_since)} missing={row.avg_cost_since == null} />
            <PropertyRow label="Max cost since" value={usd(row.max_cost_since)} missing={row.max_cost_since == null} />
            <PropertyRow label="Runs since" value={String(row.runs_since)} meta={when(row.since_at)} />
            <PropertyRow label="Automated runs (30d)" value={String(row.automated_runs_30d)} />
            <PropertyRow label="Held runs" value={String(row.blocked_runs)} meta={when(row.last_blocked_at)} />
            <PropertyRow label="Approval threshold" value={usd(row.threshold_usd)} />
          </Facts>
        </Section>
        <Section title="Subject">
          <Facts>
            <PropertyRow label="Type" value={kindLabel} />
            <PropertyRow label="Feature" value={row.feature || undefined} missing={!row.feature} />
            <PropertyRow label="Key" missing={!row.feature_mandate_key} mono>
              {row.feature_mandate_key ? (
                <Link className="text-primary hover:underline" href={mandateKeyHref(row.feature_mandate_key, seat, orgSlug)}>
                  {row.feature_mandate_key}
                </Link>
              ) : undefined}
            </PropertyRow>
            <PropertyRow label="Agent" missing={!row.agent_id}>
              {row.agent_id ? <EntityRef token="agent" id={row.agent_id} name={row.agent_name} showIcon={false} /> : undefined}
            </PropertyRow>
            <PropertyRow label="Organization">
              {seat === "admin" ? (
                <EntityRef token="organization" id={row.organization_id} name={row.organization_name ?? "Organization"} />
              ) : (
                (row.organization_name ?? undefined)
              )}
            </PropertyRow>
            <PropertyRow label="First run" missing={!row.first_run_at} meta={usd(row.first_run_cost)}>
              {row.first_run_at ? (
                runHref ? (
                  <Link className="text-primary hover:underline" href={runHref}>{when(row.first_run_at)}</Link>
                ) : (
                  when(row.first_run_at)
                )
              ) : undefined}
            </PropertyRow>
            <PropertyRow label="Run by" value={row.first_run_person_email ?? undefined} missing={!row.first_run_person_email ? "Unknown person" : false} />
            <PropertyRow label="Started by" value={startedByLabel(row.started_by) || undefined} missing={!startedByLabel(row.started_by)} />
            <PropertyRow label="First run models" value={row.first_run_models.join(", ") || undefined} missing={row.first_run_models.length === 0} />
          </Facts>
        </Section>
        <Section title="Decided">
          <Facts>
            <PropertyRow label="Decided by" value={row.decided_by_email ?? undefined} missing={!row.decided_by_email ? "Not decided" : false} />
            <PropertyRow label="Decided at" value={when(row.decided_at)} missing={!row.decided_at ? "Not decided" : false} />
            <PropertyRow label="Note" value={row.decision_note ?? undefined} missing={!row.decision_note} />
            <PropertyRow label="Tracking reset" value={when(row.reset_at)} missing={!row.reset_at ? "Never" : false} meta={row.reset_by_email ?? undefined} />
            <PropertyRow label="Before rule" value={row.seeded ? "Yes" : "No"} />
          </Facts>
        </Section>
        <div className="grid gap-3 lg:grid-cols-2">
          <Section title="History">
            <HistoryList id={row.id} />
          </Section>
          <Section title={`Held runs · ${row.blocked_runs}`}>
            <HeldRunsList approvalId={row.id} />
          </Section>
        </div>
        {related.length > 0 ? (
          <Section title="Related approvals">
            <ul className="flex flex-col">
              {related.map((r) => (
                <li key={r.id} className="flex min-w-0 items-center gap-3 border-b border-border/60 py-1.5 last:border-b-0">
                  <Link className="min-w-0 truncate text-primary hover:underline" href={approvalRecordHref(r.subject_kind, r.subject_id, seat, orgSlug)}>
                    {r.subject_name ?? r.subject_id}
                  </Link>
                  <span className="shrink-0 type-secondary text-muted-foreground">
                    {SUBJECT_KIND_LABEL[r.subject_kind]} · {APPROVAL_STATUS_LABEL[r.status]}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
      <DecisionDialog pending={pending} knobs={knobs} onClose={() => setPending(null)} onDone={reload} />
    </>
  );
}
