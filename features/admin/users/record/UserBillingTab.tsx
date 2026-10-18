"use client";

// A person's Billing & usage tab (/administration/users/<id>/billing). Plan + source + grant
// expiry and the usage windows come from the page's overview (admin.user_overview →
// billing.user_usage_state, verbatim). The history is THE one billing read,
// admin.user_billing_events (userBillingEvents.ts) — the Activity tab's Billing source is the same
// read, so the two never disagree; each row opens its record. Change plan and Free months run
// through the page's one dispatch (useUserActions); Reset window is this tab's own action
// (ResetUsageDialog → billing.usage_reset_apply). The full usage drill is a link-out.

import { useEffect, useState } from "react";
import { useRecordLoad } from "./useRecordLoad";
import { ExternalLink, Gift, RotateCcw, WalletCards } from "lucide-react";
import { formatCount } from "@ai-matrx/kit/format";
import { ErrorNotice, readOf } from "@ai-matrx/design-system";
import { Badge, Button, PropertyRow } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import AppLink from "@/components/navigation/AppLink";
import { periodLabel } from "@/features/admin/limits/types";
import { usagePersonHref } from "@/features/admin/usage-drill/usageLinks";
import { ResetUsageDialog, type ResetUsagePerson } from "../components/ResetUsageDialog";
import { AdminUserRef } from "../components/AdminUserRef";
import { personTitle } from "./userOverview";
import { billingEventHref, fetchUserBillingEvents, type BillingEventKind, type UserBillingEvent } from "./userBillingEvents";
import type { UserTabBodyProps } from "./UserRecordPage";

const SOURCE_LABEL: Record<string, string> = {
  guest: "Guest",
  grant: "Free-time grant",
  organization: "Organization plan",
  default: "Default plan",
};

const KIND_LABEL: Record<BillingEventKind, string> = {
  grant: "Free months",
  redemption: "Coupon redeemed",
  coupon: "Coupon",
  reset: "Usage reset",
  plan: "Plan",
};

function columnsFor(personId: string): MatrxColumnDef<UserBillingEvent>[] {
  return [
    { id: "at", accessorKey: "at", header: "When", format: { id: "datetime" }, width: 170 },
    { id: "kind", accessorFn: (e) => KIND_LABEL[e.kind] ?? e.kind, header: "Kind", filter: "select", width: 140 },
    {
      id: "title",
      accessorKey: "title",
      header: "What",
      width: 260,
      cell: (e) => (
        <AppLink href={billingEventHref(e, personId)} className="truncate hover:text-primary">
          {e.title}
        </AppLink>
      ),
    },
    { id: "detail", accessorFn: (e) => e.detail ?? "", header: "Detail", width: 240 },
    {
      id: "by",
      accessorFn: (e) => e.actorId ?? "",
      header: "By",
      width: 190,
      cell: (e) => (e.actorId ? <AdminUserRef userId={e.actorId} hideEmail /> : <span className="text-muted-foreground">—</span>),
    },
    { id: "note", accessorFn: (e) => e.note ?? "", header: "Reason", width: 240 },
  ];
}

export function UserBillingTab({ userId, overview, version: pageVersion, reload, actions, subject, shareForAi }: UserTabBodyProps) {
  const [version, setVersion] = useState(0);
  const [resetPerson, setResetPerson] = useState<ResetUsagePerson | null>(null);
  const label = personTitle(overview);
  const plan = overview.plan;
  const windows = overview.usage?.windows ?? [];
  const planBlocked = actions.blockedReason("change_plan", subject);
  const monthsBlocked = actions.blockedReason("free_months", subject);

  const { data: eventsData, loading, error } = useRecordLoad(fetchUserBillingEvents, userId, pageVersion + version);
  const events = eventsData ?? [];
  useEffect(() => shareForAi({ events }), [events, shareForAi]);

  return (
    <div className="flex flex-col gap-5" data-testid="user-billing-tab">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          icon={<WalletCards />}
          disabled={planBlocked !== null}
          title={planBlocked ?? undefined}
          onClick={() => actions.run("change_plan", subject)}
        >
          Change plan
        </Button>
        <Button
          variant="outline"
          icon={<Gift />}
          disabled={monthsBlocked !== null}
          title={monthsBlocked ?? undefined}
          onClick={() => actions.run("free_months", subject)}
        >
          Free months
        </Button>
        <Button variant="outline" icon={<RotateCcw />} onClick={() => setResetPerson({ id: userId, label })}>
          Reset window
        </Button>
        <AppLink href={usagePersonHref(userId)} className="ml-auto inline-flex items-center gap-1 type-secondary hover:text-primary">
          Open in usage explorer <ExternalLink className="h-3.5 w-3.5" />
        </AppLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <PropertyRow label="Plan" value={plan?.name ?? plan?.key ?? null} />
        <PropertyRow label="Source" value={plan ? (SOURCE_LABEL[plan.source] ?? plan.source) : null} />
        <PropertyRow
          label="Grant ends"
          value={plan?.grant_expires_at ? new Date(plan.grant_expires_at).toLocaleString() : null}
          missing={plan?.source === "grant" ? true : "No grant"}
          help={plan?.grant_note ?? undefined}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="type-title">Usage windows</h3>
        {overview.usage_error ? (
          <ErrorNotice size="inline" message="Usage could not be read" error={overview.usage_error} operation="Read usage" calls={["billing.user_usage_state"]} />
        ) : windows.length === 0 ? (
          <p className="type-secondary text-muted-foreground">No usage windows on this plan</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {windows.map((w) => (
              <PropertyRow
                key={w.period}
                label={periodLabel(w.period)}
                value={`${formatCount(w.used)} / ${w.limit === null ? "no limit" : formatCount(w.limit)}`}
                meta={
                  <span className="inline-flex items-center gap-1.5">
                    <Badge tone={w.state === "over" ? "destructive" : w.state === "near" ? "warning" : "success"}>{w.state}</Badge>
                    {w.resets_at ? `resets ${new Date(w.resets_at).toLocaleString()}` : null}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="type-title">Billing history</h3>
        <MatrxDataTable
          data={events}
          columns={columnsFor(userId)}
          getRowId={(e) => e.key}
          isLoading={loading}
          pageSize={25}
          read={readOf({ loading, error }, { what: "billing history", onRetry: () => setVersion((v) => v + 1) })}
          emptyState={{
            title: "No billing history",
            icon: <Gift className="h-6 w-6 text-muted-foreground" />,
          }}
        />
      </section>

      <ResetUsageDialog person={resetPerson} onClose={() => setResetPerson(null)} onDone={() => reload()} />
    </div>
  );
}
