// features/settings/tabs/PlanUsageTab.tsx
//
// Settings → Plan & usage. The home of "where am I at right now".
//
// AI points are per user first (USAGE-GATE.md), so the PRIMARY card is the
// person's own state — `billing.user_usage_state` via the usage gate's Redux
// answer — never an organization's numbers. The organization's spend budget
// and plan follow as a separate, labeled section, scoped to the EXPLICIT
// active organization (a write-side choice, never a stand-in): with none
// selected those cards say "Pick an organization" and offer the picker.

"use client";

import { BarChart3, Building2, Gauge, UserRound } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsCallout } from "@ai-matrx/design-system/settings";
import { SettingsSubHeader } from "@ai-matrx/design-system/settings";
import { PlanUsagePanel } from "@/features/entitlements/components/PlanUsagePanel";
import { SpendBudgetCard } from "@/features/entitlements/guardrails/SpendBudgetCard";
import { MyUsageCard } from "@/features/entitlements/usage-gate/MyUsageCard";
import { RedeemCodeField } from "@/features/entitlements/coupons/RedeemCodeField";
import { BillingSummary } from "@/features/entitlements/components/BillingSummary";
import { MyCostSoFar } from "@/features/entitlements/usage-history/MyCostSoFar";
import { UsageHistory } from "@/features/entitlements/usage-history/UsageHistory";
import { MyUsageExplorer } from "@/features/entitlements/usage-drill/MemberUsageExplorer";
import { OrganizationChooser } from "@/features/organizations/components/OrganizationChooser";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectUsageGateFreePeriod, selectUsageGatePlanName } from "@/features/entitlements/state/selectors";

export function PlanUsageTab() {
  const userId = useAppSelector(selectUserId);
  const planName = useAppSelector(selectUsageGatePlanName);
  const freePeriod = useAppSelector(selectUsageGateFreePeriod);
  const effectivePlan = {
    name: planName ?? null,
    freeUntilIso: freePeriod?.status === "active" ? (freePeriod.endsAt ?? null) : null,
  };
  const [billingOrganizationId, setBillingOrganizationId] = useState<string | null>(null);
  const organizationId = billingOrganizationId;

  return (
    <div className="matrx-touch-targets space-y-3">
      <SettingsSubHeader
        title="Plan & usage"
        icon={Gauge}
      />
      {userId ? <BillingSummary scope={{ kind: "personal", userId }} effectivePlan={effectivePlan} /> : null}
      <SettingsSubHeader title="Effective usage" icon={UserRound} />
      <MyUsageCard />
      <MyCostSoFar />
      <UsageHistory />
      <SettingsSubHeader title="My usage" icon={BarChart3} />
      <div className="h-[80vh] min-h-[560px] overflow-hidden rounded-md border border-border bg-card" data-my-usage-drill="">
        <MyUsageExplorer />
      </div>
      {/* Free-time coupons for this account (rule 18): POST /api/billing/coupons/redeem. */}
      <RedeemCodeField />
      <SettingsSubHeader
        title="Organization"
        icon={Building2}
      />
      <div className="rounded-md border border-border bg-card p-4">
        <label className="text-sm font-medium text-foreground" htmlFor="billing-organization">
          Organization billing account
        </label>
        <OrganizationChooser
          value={billingOrganizationId}
          placeholder="Choose an organization"
          className="mt-2"
          onChange={(org) => setBillingOrganizationId(org.id)}
        />
      </div>
      {billingOrganizationId ? <BillingSummary scope={{ kind: "organization", organizationId: billingOrganizationId }} /> : null}
      <SettingsCallout tone="info">
        Limits marked Planning only help you plan ahead. They do not stop work.
      </SettingsCallout>
      {/* The organization's AI budget — its entitlement, its ceiling, and the
          lower one the person chooses for themselves inside it. */}
      <SpendBudgetCard organizationId={organizationId} mode="user" canEdit />
      <PlanUsagePanel organizationId={organizationId} />
    </div>
  );
}

export default PlanUsageTab;
