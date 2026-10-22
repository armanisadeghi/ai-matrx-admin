"use client";

// /organizations/[orgId]/settings/payments — the organization collects payments into ITS OWN
// Stripe account (Stripe Connect, direct charges, no platform fee — Arman 2026-10-17).
//
// Reads go direct to Supabase (billing.org_payments_status, billing.payment_asks, custom.forms);
// setting an ask is the admin door billing.payment_ask_set. Only the Stripe calls (create the
// account, onboarding link, refresh, disconnect) go through /api/payments/connect, because they
// need the platform's Stripe secret. Plan: common-docs/systems/data/custom-data/PAYMENTS-CONNECT.md

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { useResolvedOrganization } from "@/features/organizations/hooks";
import { OrganizationAccessGate } from "@/features/organizations/components/OrganizationAccessGate";
import { Badge, Button, Field, PropertyRow, RegionSkeleton, Select, Switch } from "@ai-matrx/design-system/controls";
import { formatMoney } from "@ai-matrx/kit/format";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { accountBadge, type SiteStripeMode } from "@/features/payments/account-state";

interface PaymentsStatus {
  connected: boolean;
  can_manage: boolean;
  stripe_account_id?: string;
  livemode?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  display_name?: string | null;
}

interface Ask {
  id: string;
  subject_kind: "form" | "table";
  subject_id: string;
  table_id: string;
  enabled: boolean;
  amount_mode: "fixed" | "field";
  amount_cents: number | null;
  amount_field: string | null;
  currency: string;
  description: string | null;
  paid_count: number;
  paid_cents: number;
}

interface FormRow {
  form_id: string;
  table_id: string;
  title: string;
  state: string;
}

/** `siteMode` is THIS site's Stripe mode (read on the server by page.tsx): an account in the other
 *  mode cannot charge anyone here, and the badge says so. */
export function PaymentsSettings({ siteMode }: { siteMode: SiteStripeMode }) {
  const params = useParams();
  const search = useSearchParams();
  const orgId = params.orgId as string;
  const { organization, organizationId, loading, error, refresh } = useResolvedOrganization(orgId);
  const [status, setStatus] = useState<PaymentsStatus | null>(null);
  // false until the first status read answers (either way) - the badge never announces a state we have not read.
  const [statusRead, setStatusRead] = useState(false);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [forms, setForms] = useState<FormRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId) return;
    const supabase = createClient();
    const [s, a, f] = await Promise.all([
      supabase.schema("billing").rpc("org_payments_status", { p_organization_id: organizationId }),
      supabase.schema("billing").rpc("payment_asks", { p_organization_id: organizationId }),
      supabase.schema("custom").rpc("forms", { p_organization_id: organizationId, p_table_id: null as unknown as string }),
    ]);
    if (s.error) toast.error(s.error.message);
    else setStatus(s.data as unknown as PaymentsStatus);
    setStatusRead(true);
    if (!a.error) setAsks((a.data as unknown as Ask[]) ?? []);
    if (!f.error) setForms(((f.data as unknown as FormRow[]) ?? []).filter((row) => row.form_id));
  }, [organizationId]);

  const connectApi = useCallback(
    async (method: "POST" | "GET" | "DELETE") => {
      if (!organizationId) return null;
      const response = await fetch(`/api/payments/connect?organization_id=${organizationId}`, { method });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok) {
        toast.error(body.error ?? "Stripe did not answer.");
        return null;
      }
      return body;
    },
    [organizationId],
  );

  useEffect(() => {
    void (async () => {
      // Back from Stripe's onboarding: re-read the account so the flags are current.
      if (organizationId && search.get("stripe")) await connectApi("GET");
      await load();
    })();
  }, [organizationId, search, connectApi, load]);

  const header = (
    <RecordPageHeader
      backHref={`/organizations/${orgId}/settings`}
      parents={[
        organization ? { label: organization.name, href: `/organizations/${orgId}` } : { label: "", pending: true, href: `/organizations/${orgId}` },
        { label: "Settings", href: `/organizations/${orgId}/settings` },
      ]}
      record={{ name: "Payments" }}
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <RegionSkeleton />
      </>
    );
  }
  if (error || !organization || !organizationId) {
    return <OrganizationAccessGate orgSlugOrId={orgId} organizationId={organizationId ?? undefined} onRetry={refresh} />;
  }

  const canManage = Boolean(status?.can_manage);
  const badge = accountBadge(status ?? { connected: false }, siteMode);
  const ready = badge.canCharge;

  // The badge follows the press at once (REVIEW-PAYMENTS item 9): a reconnect re-reads the status
  // before leaving for Stripe; a disconnect shows Not connected immediately and puts the old status
  // back if the server refused.
  async function startConnect() {
    setBusy("connect");
    const body = await connectApi("POST");
    if (body?.url) {
      await load();
      window.location.assign(body.url);
    } else setBusy(null);
  }

  async function disconnect() {
    const before = status;
    setBusy("disconnect");
    setConfirmDisconnect(false);
    setStatus({ connected: false, can_manage: Boolean(before?.can_manage) });
    const body = await connectApi("DELETE");
    if (!body) setStatus(before);
    setBusy(null);
    void load();
  }

  return (
    <>
      {header}
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Stripe account</h2>
            {!statusRead ? (
              <span aria-hidden className="h-5 w-24 animate-pulse rounded-full bg-muted" />
            ) : status?.connected ? (
              <Badge tone={badge.tone === "neutral" ? undefined : badge.tone}>{badge.label}</Badge>
            ) : status ? (
              <Badge>Not connected</Badge>
            ) : (
              <Badge tone="warning">Status unavailable</Badge>
            )}
          </div>
          {status?.connected ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <PropertyRow label="Account" value={status.display_name || status.stripe_account_id || ""} />
              <PropertyRow label="Mode" value={status.livemode ? "Live" : "Test"} />
              <PropertyRow label="Payouts" value={status.payouts_enabled ? "On" : "Off"} />
            </div>
          ) : null}
          {status?.connected && badge.line ? <p className="text-sm text-warning">{badge.line}</p> : null}
          <p className="text-sm text-muted-foreground">Payments go straight to your Stripe account. No platform fee.</p>
          {!statusRead ? null : canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={startConnect} disabled={busy !== null}>
                {!status?.connected
                  ? "Connect Stripe"
                  : badge.line
                    ? siteMode === "live" ? "Connect live Stripe" : "Connect test Stripe"
                    : ready ? "Open Stripe setup" : "Finish setup"}
              </Button>
              {status?.connected ? (
                confirmDisconnect ? (
                  <Button variant="danger" onClick={disconnect} disabled={busy !== null}>
                    Stop collecting payments
                  </Button>
                ) : (
                  <Button variant="quiet" onClick={() => setConfirmDisconnect(true)}>
                    Disconnect
                  </Button>
                )
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">An organization admin can connect Stripe.</p>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Forms and booking pages</h2>
          {forms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No forms yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {forms.map((form) => (
                <AskRow
                  key={form.form_id}
                  organizationId={organizationId}
                  form={form}
                  ask={asks.find((a) => a.subject_kind === "form" && a.subject_id === form.form_id) ?? null}
                  portalAsk={asks.find((a) => a.subject_kind === "table" && a.subject_id === form.table_id) ?? null}
                  canManage={canManage}
                  onSaved={load}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

const CURRENCIES = [
  { value: "usd", label: "USD" },
  { value: "eur", label: "EUR" },
  { value: "gbp", label: "GBP" },
  { value: "cad", label: "CAD" },
  { value: "aud", label: "AUD" },
] as const;

function AskRow({
  organizationId,
  form,
  ask,
  portalAsk,
  canManage,
  onSaved,
}: {
  organizationId: string;
  form: FormRow;
  ask: Ask | null;
  portalAsk: Ask | null;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(Boolean(ask?.enabled));
  const [amount, setAmount] = useState(ask?.amount_cents ? (ask.amount_cents / 100).toFixed(2) : "");
  const [currency, setCurrency] = useState<string>(ask?.currency ?? "usd");
  const [description, setDescription] = useState(ask?.description ?? form.title);
  const [inPortal, setInPortal] = useState(Boolean(portalAsk?.enabled));
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(Number(amount) * 100);
    if (enabled && (!Number.isFinite(cents) || cents < 50)) {
      toast.error("Enter an amount of at least 0.50.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const spec = { enabled, amount_mode: "fixed", amount_cents: cents >= 50 ? cents : 50, currency, description };
    const first = await supabase.schema("billing").rpc("payment_ask_set", {
      p_organization_id: organizationId,
      p_subject_kind: "form",
      p_subject_id: form.form_id,
      p_spec: spec,
    });
    const second =
      !first.error && (inPortal || portalAsk)
        ? await supabase.schema("billing").rpc("payment_ask_set", {
            p_organization_id: organizationId,
            p_subject_kind: "table",
            p_subject_id: form.table_id,
            p_spec: { ...spec, enabled: enabled && inPortal },
          })
        : { error: null };
    setSaving(false);
    const failed = first.error ?? second.error;
    if (failed) toast.error(failed.message);
    else toast.success("Saved");
    await onSaved();
  }

  return (
    <div className="space-y-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{form.title}</div>
          {ask && ask.paid_count > 0 ? (
            <div className="text-xs text-muted-foreground">
              {ask.paid_count} paid · {formatMoney(ask.paid_cents, { currency: ask.currency, unit: "minor" })}
            </div>
          ) : null}
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!canManage} aria-label="Ask for payment" />
      </div>
      {enabled ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_7rem_8rem_auto] sm:items-center">
          {/* ui-exception: a plain label for the Stripe line item, not prose */}
          <Field value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it is for" disabled={!canManage} aria-label="Description" />
          {/* ui-exception: a raw money amount */}
          <Field value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25.00" inputMode="decimal" disabled={!canManage} aria-label="Amount" />
          <Select value={currency} options={CURRENCIES} onValueChange={setCurrency} aria-label="Currency" disabled={!canManage} />
          <Button variant="primary" onClick={save} disabled={!canManage || saving}>
            Save
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-4">
            <Switch checked={inPortal} onCheckedChange={setInPortal} disabled={!canManage} aria-label="Offer Pay in portals" />
            Offer Pay on these records in portals
          </label>
        </div>
      ) : ask?.enabled ? (
        <Button variant="outline" onClick={save} disabled={!canManage || saving}>
          Stop asking for payment
        </Button>
      ) : null}
    </div>
  );
}
