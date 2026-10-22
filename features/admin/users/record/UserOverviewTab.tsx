"use client";

// Overview tab of one person's admin record (/administration/users/<id>): the KPI strip, what needs
// attention (each item opens its own record), and the right rail of identity / account facts.
// Everything shown comes from admin.user_overview — nothing here is a placeholder.

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  Gauge,
  LifeBuoy,
  MessageSquareWarning,
  PauseCircle,
  ShieldAlert,
} from "lucide-react";
import AppLink from "@/components/navigation/AppLink";
import { EmailValue, ErrorNotice, PhoneValue } from "@ai-matrx/design-system";
import { Badge, Button, PropertyRow, KpiGrid, KpiTile } from "@ai-matrx/design-system/controls";
import { MatrxUuidCell } from "@ai-matrx/design-system/data-table/uuid-cell";
import { formatCount } from "@ai-matrx/kit/format";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { usagePersonHref } from "@/features/admin/usage-drill/usageLinks";
import { SPEND_APPROVALS_ADMIN_PATH, approvalSubjectHref } from "@/features/admin/spend-approvals/spendApprovals";
import { heldRunHref } from "@/features/admin/held-runs/heldRuns";
import { feedbackHref } from "@/features/admin/feedback/doors";
import { periodLabel } from "@/features/admin/limits/types";
import { ADMIN_LEVEL_LABEL } from "../constants";
import { personStatus } from "../lib/accountStatus";
import { userRecordHref } from "./userSurfaces";
import { AI_REQUESTS_LABEL, actionSubjectOf, isClosed, personTitle, type UserOverview } from "./userOverview";

const PLAN_SOURCE_LABEL: Record<NonNullable<UserOverview["plan"]>["source"], string> = {
  grant: "Assigned to this person",
  default: "Default plan",
  guest: "Guest allowance",
  organization: "From an organization",
};

function when(iso: string | null | undefined): string | null {
  return iso
    ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
}

function day(iso: string | null | undefined): string | null {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
}

function yesNo(v: boolean): string {
  return v ? "Yes" : "No";
}

export interface AttentionItem {
  key: string;
  icon: typeof AlertTriangle;
  tone: "destructive" | "warning" | "info";
  label: string;
  detail?: string | null;
  href?: string;
  action?: { label: string; onPress: () => void };
}

const TONE_ICON: Record<AttentionItem["tone"], string> = {
  destructive: "text-destructive",
  warning: "text-warning",
  info: "text-primary",
};

/** The Overview's Needs attention list, in order (also the record surface's `attention_items`). */
export function attentionOf(o: UserOverview, onReopen: () => void): AttentionItem[] {
  const items: AttentionItem[] = [];
  const a = o.attention;
  if (isClosed(o)) {
    items.push({
      key: "closed",
      icon: Ban,
      tone: "destructive",
      label: o.closure?.erased_at ? "Account erased" : "Account closed",
      detail: [day(o.closure?.closed_at), o.closure?.reason].filter(Boolean).join(" · ") || null,
      action: o.closure?.erased_at ? undefined : { label: "Reopen", onPress: onReopen },
    });
  }
  if (a.support_live) {
    items.push({
      key: "support",
      icon: LifeBuoy,
      tone: "info",
      label: "Support session live",
      detail: a.support_live.expires_at ? `Until ${when(a.support_live.expires_at)}` : a.support_live.status,
      href: userRecordHref(o.identity.id, "support"),
    });
  }
  const usageState = o.usage?.state;
  if (usageState && usageState !== "ok") {
    const binding = o.usage?.windows?.find((w) => w.period === o.usage?.binding_period);
    items.push({
      key: "usage",
      icon: Gauge,
      tone: usageState === "near" ? "warning" : "destructive",
      label: usageState === "near" ? "Near usage limit" : "Over usage limit",
      detail: binding
        ? `${periodLabel(binding.period)}: ${formatCount(binding.used)} / ${binding.limit === null ? "unlimited" : formatCount(binding.limit)} points`
        : null,
      href: usagePersonHref(o.identity.id),
    });
  }
  for (const r of a.approvals_waiting) {
    items.push({
      key: `approval:${r.id}`,
      icon: ShieldAlert,
      tone: "warning",
      label: `Approval waiting · ${r.subject_name ?? r.subject_kind}`,
      detail: r.blocked_runs ? `${formatCount(r.blocked_runs)} runs blocked` : null,
      href: approvalSubjectHref(r.subject_kind, r.subject_id),
    });
  }
  // The read returns at most a few of each; the counts say how many there are (S7).
  const moreApprovals = a.approvals_waiting_count - a.approvals_waiting.length;
  if (moreApprovals > 0) {
    items.push({
      key: "approval:more",
      icon: ShieldAlert,
      tone: "warning",
      label: `+${formatCount(moreApprovals)} more ${moreApprovals === 1 ? "approval" : "approvals"} waiting`,
      href: SPEND_APPROVALS_ADMIN_PATH,
    });
  }
  const newest = a.held_runs[0];
  if (newest) {
    items.push({
      key: "held",
      icon: PauseCircle,
      tone: "warning",
      label: `${formatCount(a.held_runs_count)} held ${a.held_runs_count === 1 ? "run" : "runs"} (30 days)`,
      detail: `Newest: ${newest.agent_name ?? newest.mandate_key ?? "run"} · ${when(newest.last_seen_at)}`,
      href: heldRunHref(newest.id),
    });
  }
  for (const f of a.feedback_open) {
    items.push({
      key: `feedback:${f.id}`,
      icon: MessageSquareWarning,
      tone: "info",
      label: `Open ${f.feedback_type ?? "feedback"} · ${f.status.replace(/_/g, " ")}`,
      detail: f.description,
      href: feedbackHref(f.id),
    });
  }
  const moreFeedback = a.feedback_open_count - a.feedback_open.length;
  if (moreFeedback > 0) {
    items.push({
      key: "feedback:more",
      icon: MessageSquareWarning,
      tone: "info",
      label: `+${formatCount(moreFeedback)} more open feedback`,
      href: userRecordHref(o.identity.id, "support"),
    });
  }
  return items;
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = item.icon;
  const body = (
    <>
      <Icon className={`h-4 w-4 shrink-0 ${TONE_ICON[item.tone]}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.label}</span>
        {item.detail ? <span className="block truncate text-xs text-muted-foreground">{item.detail}</span> : null}
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
      {item.href ? (
        <AppLink href={item.href} className="flex min-w-0 flex-1 items-center gap-3 hover:text-primary" data-clickable="">
          {body}
        </AppLink>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
      )}
      {item.action ? (
        <Button variant="outline" onClick={item.action.onPress}>
          {item.action.label}
        </Button>
      ) : null}
    </li>
  );
}

function Section({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function UserOverviewTab({ overview: o, onReopen }: { overview: UserOverview; onReopen: () => void }) {
  const attention = attentionOf(o, onReopen);
  const binding = o.usage?.windows?.find((w) => w.period === o.usage?.binding_period) ?? null;
  const usedPct = binding && binding.limit ? Math.round((binding.used / binding.limit) * 100) : null;
  const ai = o.ai;
  const acq = o.acquisition;
  const acquisition = acq ? [acq.traffic_kind?.replace(/_/g, " "), acq.campaign, acq.referrer_host].filter(Boolean).join(" · ") : "";
  const closed = isClosed(o);
  const subject = actionSubjectOf(o);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" data-testid="user-overview">
      <div className="flex min-w-0 flex-col gap-4">
        <KpiGrid className="lg:grid-cols-3 2xl:grid-cols-6">
          <KpiTile label={`${AI_REQUESTS_LABEL} · 30d`} value={ai ? formatCount(ai.requests_30d) : null} hint={ai ? `${formatCount(ai.requests_total)} all time` : undefined} href={usagePersonHref(o.identity.id)} />
          <KpiTile label="AI cost · 30d" value={ai ? formatAdminUsd(ai.cost_30d) : null} hint={ai ? `${formatAdminUsd(ai.cost_total)} all time` : undefined} href={usagePersonHref(o.identity.id)} />
          <KpiTile label="Active days · 30d" value={ai ? formatCount(ai.active_days_30d) : null} hint={ai?.last_ai_at ? `Last AI ${day(ai.last_ai_at)}` : undefined} />
          <KpiTile
            label={binding ? `Usage · ${periodLabel(binding.period)}` : "Usage"}
            value={usedPct === null ? (binding ? "Unlimited" : null) : `${usedPct}%`}
            tone={o.usage?.state === "over" ? "bad" : o.usage?.state === "near" ? "warn" : "neutral"}
            hint={binding ? `${formatCount(binding.used)} points used` : undefined}
            href={usagePersonHref(o.identity.id)}
          />
          <KpiTile label="Conversations" value={formatCount(o.counts.conversations)} href={userRecordHref(o.identity.id, "activity")} />
          <KpiTile label="Organizations" value={formatCount(o.counts.organizations)} href={userRecordHref(o.identity.id, "organizations")} />
        </KpiGrid>

        {o.usage_error ? (
          <ErrorNotice size="inline" message="Usage state could not load." error={o.usage_error} operation="Read usage state" calls={["billing.user_usage_state"]} />
        ) : null}

        <Section
          title="Needs attention"
          extra={attention.length ? <Badge tone="warning">{formatCount(attention.length)}</Badge> : null}
        >
          {attention.length ? (
            <ul data-testid="user-attention">{attention.map((item) => <AttentionRow key={item.key} item={item} />)}</ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nothing needs attention</p>
          )}
        </Section>
      </div>

      <aside className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3" aria-label={`${personTitle(o)} details`}>
        <PropertyRow label="Email" missing={!o.identity.email}>
          {o.identity.email ? <EmailValue email={o.identity.email} owner={personTitle(o)} /> : null}
        </PropertyRow>
        <PropertyRow label="User ID">
          <MatrxUuidCell value={o.identity.id} label="User ID" />
        </PropertyRow>
        <PropertyRow label="Sign-in methods" value={o.identity.providers.join(", ")} missing={o.identity.providers.length ? undefined : "None"} />
        <PropertyRow label="Email confirmed" value={o.identity.email_confirmed_at ? day(o.identity.email_confirmed_at) : "No"} />
        <PropertyRow label="Phone" missing={!o.identity.phone}>
          {o.identity.phone ? <PhoneValue phone={o.identity.phone} owner={personTitle(o)} /> : null}
        </PropertyRow>
        <PropertyRow label="Created" value={day(o.identity.created_at)} />
        <PropertyRow label="Last sign-in" value={when(o.identity.last_sign_in_at)} missing={o.identity.last_sign_in_at ? undefined : "Never"} />
        <PropertyRow
          label="Plan"
          value={o.plan?.name ?? o.usage?.plan_name ?? o.plan?.key}
          meta={o.plan ? PLAN_SOURCE_LABEL[o.plan.source] : undefined}
          help={o.plan?.grant_note ?? undefined}
          missing={o.plan?.name ?? o.usage?.plan_name ?? o.plan?.key ? undefined : "Unknown"}
        />
        {o.plan?.grant_expires_at ? <PropertyRow label="Plan ends" value={day(o.plan.grant_expires_at)} /> : null}
        <PropertyRow label="Admin level" value={o.admin_level ? (ADMIN_LEVEL_LABEL[o.admin_level] ?? o.admin_level) : "None"} />
        <PropertyRow label="Top-tier models" value={yesNo(subject.top_tier_models)} />
        <PropertyRow
          label="Full MCP access"
          value={o.admin_level ? "Inherited from admin" : yesNo(subject.mcp_full_access)}
        />
        <PropertyRow label="Onboarded" value={yesNo(o.identity.onboarding_completed)} />
        <PropertyRow
          label="Account"
          value={personStatus(subject).label}
          meta={closed ? [o.closure?.erased_at ? "Erased" : null, day(o.closure?.closed_at)].filter(Boolean).join(" · ") : undefined}
        />
        <PropertyRow label="Acquisition" value={acquisition} missing={acquisition ? undefined : "Not recorded"} />
      </aside>
    </div>
  );
}
