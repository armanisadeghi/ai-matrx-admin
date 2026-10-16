// lib/boot/coreBootSeed.ts — the BROWSER half of the (core) layout's boot seed.
//
// `makeStore` calls `primeCoreBootSeed` once, in the browser, before the sync engine boots. Each
// fact is handed to the shared read its boot consumer already goes through, so the consumers keep
// their code, their refresh paths and their failure states; only the first boot read is answered
// without a request:
//   - the account row → `readAccountPreferencesRow` (the preferences slice AND the org ladder);
//   - memberships + organization rows → `readMemberOrganizationRows` / `membershipsService.forUser`;
//   - member counts → `membershipsService.counts`.
// A write, an organization switch, a membership change, a sign-out or a stale refresh forgets the
// held answer and asks the database again, exactly as before (`lib/sharedReads.ts` `prime`).

import { primeAccountPreferencesRow } from "@/lib/organizations/accountOrganizationChoices";
import { primeOrganizationMembershipReads } from "@/features/organizations/service/membershipsService";
import {
  membershipMaps,
  primeMemberOrganizationRows,
} from "@/features/organizations/service/memberOrganizationRows";
import type { CoreBootSeed } from "./coreBootSeedShape";

export function primeCoreBootSeed(seed: CoreBootSeed | null | undefined): void {
  if (!seed || typeof window === "undefined") return;
  primeAccountPreferencesRow(seed.userId, seed.preferencesRow);
  primeOrganizationMembershipReads(seed.memberships, seed.counts);
  const { roleByOrgId, joinedAtByOrgId } = membershipMaps(
    seed.memberships.map((m) => ({
      containerId: m.container_id,
      role: m.role,
      status: m.status,
      createdAt: m.created_at,
    })),
  );
  primeMemberOrganizationRows(seed.userId, {
    ok: true,
    roleByOrgId,
    joinedAtByOrgId,
    rows: seed.organizations,
  });
}
