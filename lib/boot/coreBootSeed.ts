// lib/boot/coreBootSeed.ts — the BROWSER half of the (core) layout's boot seed.
//
// `makeStore` calls `primeCoreBootSeed` once, in the browser, before the sync engine boots. Each
// fact is handed to the shared read its boot consumer already goes through, so the consumers keep
// their code, their refresh paths and their failure states; only the first boot read is answered
// without a request:
//   - the account row → `readAccountPreferencesRow` (the preferences slice AND the org ladder);
//   - the first page of her organizations → `readMemberOrganizationRows` (a page, never all);
//   - member counts → `membershipsService.counts`.
// A write, an organization switch, a membership change, a sign-out or a stale refresh forgets the
// held answer and asks the database again, exactly as before (`lib/sharedReads.ts` `prime`).

import { primeAccountPreferencesRow } from "@/lib/organizations/accountOrganizationChoices";
import { primeOrganizationMembershipReads } from "@/features/organizations/service/membershipsService";
import {
  membershipMaps,
  primeMemberOrganizationRows,
} from "@/features/organizations/service/memberOrganizationRows";
import { primeKnobSnapshot } from "@/lib/scoped-config/effectiveKnobs";
import { parseCoreBootSeed, type CoreBootSeed, type KnobSnapshotSeed } from "./coreBootSeedShape";
import { registerBootSeedDrain, STREAMED_CORE_SEED_GLOBAL, STREAMED_KNOB_SEED_GLOBAL } from "./bootSeedSlot";

export function primeCoreBootSeed(seed: CoreBootSeed | null | undefined): void {
  if (!seed || typeof window === "undefined") return;
  primeAccountPreferencesRow(seed.userId, seed.preferencesRow);
  // Counts only: the seed's memberships are one PAGE, so they never answer "all my memberships".
  primeOrganizationMembershipReads(seed.counts);
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
    memberCountByOrgId: new Map(seed.counts.map((c) => [c.container_id, Number(c.member_count)])),
    rows: seed.organizations,
    total: seed.organizationsTotal,
    hasMore: seed.organizationsHasMore,
    nextCursor: seed.organizationsNextCursor,
  });
}

/** Take a streamed global once (the script wrote it; nothing else reads it). */
function takeGlobal(name: string): unknown {
  const w = window as unknown as Record<string, unknown>;
  const value = w[name];
  if (value === undefined) return undefined;
  delete w[name];
  return value;
}

// The streamed seeds (`BootSeedScript`): installed by the first read that could use them.
if (typeof window !== "undefined") {
  registerBootSeedDrain(() => {
    const core = takeGlobal(STREAMED_CORE_SEED_GLOBAL) as CoreBootSeed | undefined;
    // Already parsed on the server; re-checked so a malformed global never seeds.
    if (core) primeCoreBootSeed(parseCoreBootSeed(toRaw(core), core.userId));
    const knobs = takeGlobal(STREAMED_KNOB_SEED_GLOBAL) as KnobSnapshotSeed[] | undefined;
    if (Array.isArray(knobs)) for (const knob of knobs) primeKnobSnapshot(knob);
  });
}

function toRaw(seed: CoreBootSeed): Record<string, unknown> {
  return {
    user_id: seed.userId,
    memberships: seed.memberships,
    organizations: seed.organizations,
    counts: seed.counts,
    organizations_total: seed.organizationsTotal,
    organizations_has_more: seed.organizationsHasMore,
    organizations_next_cursor: seed.organizationsNextCursor,
    preferences_row: seed.preferencesRow,
  };
}
