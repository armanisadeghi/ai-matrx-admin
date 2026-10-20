"use client";

// features/crm/hooks/useCrmContext.ts
//
// Resolve the caller's CrmQueryContext (identity + org memberships) ONCE per
// mount. Extracted from usePartyList so every CRM surface (list, duplicates
// review, assists producer) shares the same resolution instead of re-rolling
// the org fetch.

import { fetchMyTeamReach, type TeamReachPair } from "@/lib/list-scope/teamReach";
import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getUserOrganizations } from "@/features/organizations/service";
import type { CrmQueryContext } from "../types";

interface KeptCrmContext {
  orgIds: string[];
  orgNames: Record<string, string>;
  teamReach: TeamReachPair[];
  teamReachUnread: boolean;
}

export function useCrmContext(): CrmQueryContext | null {
  const userId = useAppSelector(selectUserId);
  // Kept once per person per tab (the Board's remount law): a tile that wakes or remounts reads
  // neither the memberships nor the team reach again. A failed membership read is not kept.
  const read = useStoreRead<KeptCrmContext>(
    userId ? `crm.context:${userId}` : null,
    async () => {
      let teamReachUnread = false;
      const [orgs, teamReach] = await Promise.all([
        getUserOrganizations(),
        // A failed team read must not break Mine or My Orgs; My team says it could not be read.
        fetchMyTeamReach(null).catch((e: unknown) => {
          console.error("[crm] failed to read the My team reach:", e);
          teamReachUnread = true;
          return [];
        }),
      ]);
      const orgNames: Record<string, string> = {};
      for (const org of orgs) orgNames[org.id] = org.name;
      return { orgIds: orgs.map((o) => o.id), orgNames, teamReach, teamReachUnread };
    },
  );
  const refresh = read.refresh;
  const kept = read.data;
  const failed = read.isError && !kept;
  return useMemo<CrmQueryContext | null>(() => {
    if (!userId) return null;
    if (kept) return { userId, ...kept };
    if (failed) {
      console.error("[crm] failed to load org memberships:", read.error);
      // Identity alone still serves "mine" + "public" — but the context
      // SAYS the org read failed, so a list never passes "mine" off as
      // everything (RC-B12 r13 catch-then-log census).
      return {
        userId,
        orgIds: [],
        orgNames: {},
        orgMembershipsUnread: true,
        retryOrgMemberships: () => void refresh(),
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, kept, failed]);
}
