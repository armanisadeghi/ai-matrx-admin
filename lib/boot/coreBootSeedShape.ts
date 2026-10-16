// lib/boot/coreBootSeedShape.ts — THE (core) LAYOUT'S BOOT SEED, the shape both halves share.
//
// First-paint fetch contract (Arman, 2026-10-16): the layout fetches the CORE set and that gives
// the browser everything it needs; the browser's boot reads of the same facts are answered from
// it with no request. The server half is `coreBootSeed.server.ts` (one `iam.core_boot_seed` call,
// bounded); the browser half is `coreBootSeed.ts` (primes the shared reads the boot already uses).
//
// The ACTIVE ORGANIZATION is still chosen in the browser, by the one ladder
// (`resolveActiveOrgContext`): this tab's held organization and the link's `?org=` are only known
// there. The seed carries the ladder's INPUTS (memberships, organization rows, the account row),
// so the browser runs the ladder with zero reads. The knob seed is for the organization the ladder
// predicts without a tab or link; a tab that lands elsewhere reads its own snapshot as before.

import type { AccountPreferencesRow } from "@/lib/organizations/accountOrganizationChoices";
import type { MbrCountRow, MbrForUserRow } from "@/features/organizations/service/membershipsService";
import type { MemberOrganizationRow } from "@/features/organizations/service/memberOrganizationRows";
import type { KnobSnapshotSeed } from "@/lib/scoped-config/effectiveKnobs";

export interface CoreBootSeed {
  userId: string;
  memberships: MbrForUserRow[];
  organizations: MemberOrganizationRow[];
  counts: MbrCountRow[];
  /** The account's `users.user_preferences` row; null when the person has none. */
  preferencesRow: AccountPreferencesRow | null;
}

export type { KnobSnapshotSeed };

/** `iam.core_boot_seed()`'s jsonb → the seed, or null when it is not the shape (never a guess). */
export function parseCoreBootSeed(raw: unknown, userId: string): CoreBootSeed | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.user_id !== userId) return null;
  if (!Array.isArray(r.memberships) || !Array.isArray(r.organizations) || !Array.isArray(r.counts)) {
    return null;
  }
  const row = r.preferences_row;
  return {
    userId,
    memberships: r.memberships as MbrForUserRow[],
    organizations: r.organizations as MemberOrganizationRow[],
    counts: r.counts as MbrCountRow[],
    preferencesRow: row && typeof row === "object" ? (row as AccountPreferencesRow) : null,
  };
}
