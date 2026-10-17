"use client";

// features/entitlements/usage-drill/MemberUsageExplorer.tsx — MEMBER-FACING AI USAGE: TWO MOUNTS OF THE
// ONE EXPLORER over the declared definition `ai_usage` (drill-down handoff step 6).
//   mine         — Settings › Plan & usage › "My usage": the signed-in person's own usage across every
//                  organization she belongs to (the door narrows the mine lane by the person alone).
//   organization — /organizations/[orgId]/admin/ai-spend: that one organization's usage, read only for
//                  its admins (the definition's organization lane rule is `admin`).
// Money prints as points (the explorer's credits/$ switch shows only to someone who may flip it);
// the active organization is never a filter — the organization here is the route's own, or the
// calendar the mine lane's periods are cut in.

import type { MatrxDrillQuestion } from "@ai-matrx/design-system/data-table";

import { DrillExplorer } from "@/components/official/drill-explorer/DrillExplorer";
import type { DrillNameResolver } from "@/components/official/drill-explorer/types";
import { USAGE_SOURCE } from "@/features/admin/usage-drill/useUsageDrill";
import { useUserOrganizations } from "@/features/organizations/hooks";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { OrganizationContextNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
import { EntityOrgFilter } from "@/lib/entity-list/components/EntityOrgFilter";
import { useOrgFilterParam } from "@/lib/entity-list/orgFilterUrl";
import { listOrgMembers } from "@/features/organizations/admin/service";
import type { ReactNode } from "react";

/** The mine lane's first screen: the last 30 days by model, costliest first. */
export const MY_USAGE_FIRST_QUESTION: MatrxDrillQuestion = {
  by: ["model"],
  show: ["cost", "requests", "tokens_in", "tokens_out"],
  where: [],
  sort: { key: "cost", direction: "desc" },
  window: "30d",
};

/** The organization lane's first screen: the last 30 days by person, costliest first. */
export const ORG_USAGE_FIRST_QUESTION: MatrxDrillQuestion = {
  by: ["person"],
  show: ["cost", "requests", "tokens_in", "tokens_out"],
  where: [],
  sort: { key: "cost", direction: "desc" },
  window: "30d",
};

/** In the mine lane every request is the person's own. */
const yourself: DrillNameResolver = {
  emptyLabel: "No person",
  missingLabel: "Reading the name…",
  resolve: async (ids) => ({ ok: true, names: Object.fromEntries(ids.map((id) => [id, "You"])) }),
};

/** The organization lane's people are named from the organization's own roster (the admin's door), never the platform names door. */
function organizationPeople(organizationId: string): DrillNameResolver {
  return {
    emptyLabel: "No person",
    missingLabel: "Reading the name…",
    unreadLabel: "A person who is not in this organization",
    resolve: async (ids) => {
      try {
        const members = await listOrgMembers(organizationId);
        const byId = new Map(members.map((m) => [m.userId, m.displayName ?? m.email ?? null]));
        const names: Record<string, string> = {};
        for (const id of ids) {
          const name = byId.get(id);
          if (name) names[id] = name;
        }
        return { ok: true, names };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "The members could not be read." };
      }
    },
  };
}

const loading = (
  <div className="p-4">
    <div className="h-96 animate-pulse rounded-md bg-muted/50" />
  </div>
);

export function MyUsageExplorer({ headerExtras }: { headerExtras?: ReactNode }) {
  const active = useOrganizationRequired();
  const memberships = useUserOrganizations();
  const [orgFilter, setOrgFilter] = useOrgFilterParam([]);
  // org-fallback-deliberate: the mine lane counts the person's rows in every organization; the organization here only cuts the calendar of its periods
  const calendarOrganization =
    active.organizationState === "ready" && active.organizationId ? active.organizationId : memberships.organizations[0]?.id ?? null;
  if (!calendarOrganization) {
    if (memberships.loading) return loading;
    return (
      <div className="p-4">
        <OrganizationContextNotice state={active.organizationState} what="My usage" />
      </div>
    );
  }
  return (
    <DrillExplorer
      source={USAGE_SOURCE}
      lane="mine"
      organizationId={calendarOrganization}
      title="My usage"
      rootLabel="All my usage"
      firstQuestion={MY_USAGE_FIRST_QUESTION}
      names={{ person: yourself }}
      headline={{ measure: "cost", also: ["requests"] }}
      rowNoun="request"
      countMeasure="requests"
      location="Settings › Plan & usage"
      windowAlign="hour"
      {...(orgFilter ? { pageWhere: { organization: orgFilter } } : {})}
      headerExtras={
        <>
          <EntityOrgFilter orgId={orgFilter} onChange={setOrgFilter} />
          {headerExtras}
        </>
      }
      dataAttributes={{ "data-member-usage-explorer": "mine" }}
    />
  );
}

export function OrganizationUsageExplorer({ organizationId, headerExtras }: { organizationId: string; headerExtras?: ReactNode }) {
  return (
    <DrillExplorer
      source={USAGE_SOURCE}
      lane="organization"
      organizationId={organizationId}
      title="Organization usage"
      rootLabel="All organization usage"
      firstQuestion={ORG_USAGE_FIRST_QUESTION}
      names={{ person: organizationPeople(organizationId) }}
      headline={{ measure: "cost", also: ["requests"] }}
      rowNoun="request"
      countMeasure="requests"
      location="Organization › AI spend"
      windowAlign="hour"
      {...(headerExtras ? { headerExtras } : {})}
      dataAttributes={{ "data-member-usage-explorer": "organization" }}
    />
  );
}
