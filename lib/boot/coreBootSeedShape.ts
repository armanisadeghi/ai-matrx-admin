// lib/boot/coreBootSeedShape.ts — THE (core) LAYOUT'S BOOT SEED, the shape both halves share.
//
// First-paint fetch contract (Arman, 2026-10-16): the layout fetches the CORE set and that gives
// the browser everything it needs; the browser's boot reads of the same facts are answered from
// it with no request. The server half is `coreBootSeed.server.ts` (one `iam.core_boot_seed` call,
// bounded); the browser half is `coreBootSeed.ts` (primes the shared reads the boot already uses).
//
// BOUNDED (2026-10-16): the seed carries the FIRST PAGE of her live organizations for any
// membership count (`iam.core_boot_seed` → `iam.my_organizations_page`), never all of them.
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
import type { ShellBootSeed } from "@/features/shell/shell-layout/contract";
import { parseShellBootSeed } from "@/features/shell/shell-layout/seed";

export interface CoreBootSeed {
  userId: string;
  /** The memberships of the FIRST PAGE of her live organizations (never all of them). */
  memberships: MbrForUserRow[];
  /** The first page of her live organizations, by last use (`iam.my_organizations_page`). */
  organizations: MemberOrganizationRow[];
  counts: MbrCountRow[];
  /** How many live organizations she has in all; `hasMore` = the page is not all of them. */
  organizationsTotal: number;
  organizationsHasMore: boolean;
  organizationsNextCursor: string | null;
  /** The account's `users.user_preferences` row; null when the person has none. */
  preferencesRow: AccountPreferencesRow | null;
  /**
   * THE LAYOUT BOOLEAN (custom-experience §5.3): null when neither the person nor any organization on
   * the seeded page has a saved layout — the zero-cost path for everyone who never customized. A
   * malformed value is refused (null, with a console warning naming it), never half-read.
   */
  shell: ShellBootSeed | null;
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
  if (typeof r.organizations_total !== "number" || typeof r.organizations_has_more !== "boolean") return null;
  const row = r.preferences_row;
  return {
    userId,
    memberships: r.memberships as MbrForUserRow[],
    organizations: r.organizations as MemberOrganizationRow[],
    counts: r.counts as MbrCountRow[],
    organizationsTotal: r.organizations_total,
    organizationsHasMore: r.organizations_has_more,
    organizationsNextCursor: typeof r.organizations_next_cursor === "string" ? r.organizations_next_cursor : null,
    preferencesRow: row && typeof row === "object" ? (row as AccountPreferencesRow) : null,
    shell: parseShellBootSeed(r.shell),
  };
}
