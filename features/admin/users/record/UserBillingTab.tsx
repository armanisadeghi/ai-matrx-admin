"use client";

// A person's Billing & usage tab (/administration/users/<id>/billing). Plan + source + grant
// expiry and the usage windows come from the page's overview (admin.user_overview →
// billing.user_usage_state, verbatim). The history — free-month grants, coupon redemptions and
// usage resets — is read here for this ONE person (billing tables, platform-admin read). Actions
// reuse ChangePlanDialog, GiveFreeMonthsDialog and ResetUsageDialog (billing.usage_reset_apply).
// The full usage drill is a link-out (usagePersonHref), never an embed.

import { useEffect, useState } from "react";
import { ExternalLink, Gift, RotateCcw, WalletCards } from "lucide-react";
import { formatCount } from "@ai-matrx/kit/format";
import { ErrorNotice, readOf } from "@ai-matrx/design-system";
import { Badge, Button, PropertyRow } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import AppLink from "@/components/navigation/AppLink";
import { createClient } from "@/utils/supabase/client";
import { ChangePlanDialog, type ChangePlanSubject } from "@/features/admin/limits/components/ChangePlanDialog";
import { periodLabel } from "@/features/admin/limits/types";
import { usagePersonHref } from "@/features/admin/usage-drill/usageLinks";
import { GiveFreeMonthsDialog, type FreeMonthsPerson } from "../components/GiveFreeMonthsDialog";
import { ResetUsageDialog, type ResetUsagePerson } from "../components/ResetUsageDialog";
import { AdminUserRef } from "../components/AdminUserRef";
import { personTitle } from "./userOverview";
import type { UserTabBodyProps } from "./UserRecordPage";

const COUPONS_PATH = "/administration/users/coupons";

const SOURCE_LABEL: Record<string, string> = {
  guest: "Guest",
  grant: "Free-time grant",
  organization: "Organization plan",
  default: "Default plan",
};

export interface BillingEvent {
  id: string;
  kind: "Free months" | "Coupon" | "Usage reset";
  at: string;
  detail: string;
  by: string | null;
  note: string | null;
  href: string | null;
}

/** This person's grants, coupon redemptions and usage resets, newest first. */
export async function listBillingEvents(userId: string): Promise<BillingEvent[]> {
  const billing = createClient().schema("billing");
  const [grants, redemptions, resets] = await Promise.all([
    billing
      .from("free_period_grant")
      .select("id, plan_key, months, starts_at, ends_at, source, granted_by, note, capped, created_at")
      .eq("subject_user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    billing
      .from("coupon_redemption")
      .select("id, redeemed_at, status, error, coupon:coupon!coupon_redemption_coupon_id_fkey(code, plan_key, months)")
      .eq("redeemer_user_id", userId)
      .is("deleted_at", null)
      .order("redeemed_at", { ascending: false })
      .limit(200),
    billing
      .from("usage_reset")
      .select("id, period, reset_at, reset_by, note")
      .eq("subject_user_id", userId)
      .is("deleted_at", null)
      .order("reset_at", { ascending: false })
      .limit(200),
  ]);
  const failed = grants.error ?? redemptions.error ?? resets.error;
  if (failed) throw failed;
  const out: BillingEvent[] = [];
  for (const g of grants.data ?? []) {
    out.push({
      id: `grant:${g.id}`,
      kind: "Free months",
      at: g.created_at,
      detail: `${g.months} mo · ${g.plan_key} · ends ${new Date(g.ends_at).toLocaleDateString()}${g.capped ? " · capped" : ""}`,
      by: g.granted_by,
      note: g.note,
      href: COUPONS_PATH,
    });
  }
  for (const r of redemptions.data ?? []) {
    const c = Array.isArray(r.coupon) ? r.coupon[0] : r.coupon;
    out.push({
      id: `coupon:${r.id}`,
      kind: "Coupon",
      at: r.redeemed_at,
      detail: `${c?.code ?? "coupon"} · ${c ? `${c.months} mo ${c.plan_key}` : ""} · ${r.status}`,
      by: null,
      note: r.error,
      href: COUPONS_PATH,
    });
  }
  for (const r of resets.data ?? []) {
    out.push({
      id: `reset:${r.id}`,
      kind: "Usage reset",
      at: r.reset_at,
      detail: periodLabel(r.period),
      by: r.reset_by,
      note: r.note,
      href: null,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

const COLUMNS: MatrxColumnDef<BillingEvent>[] = [
  { id: "at", accessorKey: "at", header: "When", format: { id: "datetime" }, width: 170 },
  {
    id: "kind",
    accessorKey: "kind",
    header: "Kind",
    filter: "select",
    width: 130,
    cell: (e) =>
      e.href ? (
        <AppLink href={e.href} className="hover:text-primary">
          {e.kind}
        </AppLink>
      ) : (
        <span>{e.kind}</span>
      ),
  },
  { id: "detail", accessorKey: "detail", header: "Detail", width: 280 },
  {
    id: "by",
    accessorFn: (e) => e.by ?? "",
    header: "By",
    width: 190,
    cell: (e) => (e.by ? <AdminUserRef userId={e.by} hideEmail /> : <span className="text-muted-foreground">—</span>),
  },
  { id: "note", accessorFn: (e) => e.note ?? "", header: "Note", width: 240 },
];

export function UserBillingTab({ userId, overview, reload }: UserTabBodyProps) {
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const [planTarget, setPlanTarget] = useState<ChangePlanSubject | null>(null);
  const [freeMonths, setFreeMonths] = useState<FreeMonthsPerson[] | null>(null);
  const [resetPerson, setResetPerson] = useState<ResetUsagePerson | null>(null);
  const label = personTitle(overview);
  const guest = overview.identity.is_anonymous;
  const plan = overview.plan;
  const windows = overview.usage?.windows ?? [];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listBillingEvents(userId)
      .then((list) => {
        if (!alive) return;
        setEvents(list);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId, version]);

  const changed = () => {
    setVersion((v) => v + 1);
    reload();
  };

  return (
    <div className="flex flex-col gap-5" data-testid="user-billing-tab">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          icon={<WalletCards />}
          disabled={guest}
          onClick={() =>
            setPlanTarget({ kind: "user", id: userId, name: label, currentPlanKey: plan?.key ?? null, grantActive: plan?.source === "grant" })
          }
        >
          Change plan
        </Button>
        <Button variant="outline" icon={<Gift />} disabled={guest} onClick={() => setFreeMonths([{ id: userId, label }])}>
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
          meta={plan?.grant_note ?? undefined}
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
        <h3 className="type-title">Grants, coupons & resets</h3>
        <MatrxDataTable
          data={events}
          columns={COLUMNS}
          getRowId={(e) => e.id}
          isLoading={loading}
          pageSize={25}
          read={readOf({ loading, error }, { what: "billing history", onRetry: () => setVersion((v) => v + 1) })}
          emptyState={{
            title: "No grants, coupons or resets",
            description: "Nothing given or reset for this person.",
            icon: <Gift className="h-6 w-6 text-muted-foreground" />,
          }}
        />
      </section>

      <ChangePlanDialog subject={planTarget} onClose={() => setPlanTarget(null)} onChanged={changed} />
      <GiveFreeMonthsDialog open={freeMonths !== null} people={freeMonths ?? []} onClose={() => setFreeMonths(null)} onApplied={changed} />
      <ResetUsageDialog person={resetPerson} onClose={() => setResetPerson(null)} onDone={() => changed()} />
    </div>
  );
}
