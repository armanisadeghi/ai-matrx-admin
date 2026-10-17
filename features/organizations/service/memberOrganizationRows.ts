// features/organizations/service/memberOrganizationRows.ts — lane PAGE-BUNDLE-2
//
// HER ORGANIZATIONS ARE READ ONCE PER PAGE LOAD, NOT FOUR TIMES — AND NEVER WHOLE (bounded
// organizations, 2026-10-16: the first page, see `MemberOrganizationRows`).
//
// Every page load read `iam.organizations` for the same person from three places a moment apart —
// the member list (`getUserOrganizations`, once per archive filter), the scope tree's skeleton and
// its whole tree — measured on production at 8 organization calls per page for admin@admin.com.
// They now share ONE read per archive slice: the first page of `iam.my_organizations_page` (rows,
// roles, join dates, member counts in one fixed-URL call). Shared while in
// flight and for SHARED_MS after it lands; a write that changes her organizations, or an explicit
// refresh, forgets it (`forgetMemberOrganizationRows`). A failed read is never shared past its flight.

import { requireUserId } from "@/utils/auth/getUserId";
import type { Database } from "@/types/database.types";
import { SEED_MAX_AGE_MS } from "@/lib/sharedReads";
import { drainBootSeeds, dropUnreadBootSeeds } from "@/lib/boot/bootSeedSlot";
import {
  readMyOrganizationsPage,
  type MyOrganizationEntry,
  type OrganizationArchiveSlice,
} from "./myOrganizationsPage";

export type MemberOrganizationRow = Database["iam"]["Tables"]["organizations"]["Row"];

/**
 * 🚨 A PAGE, NEVER ASSUMED WHOLE (bounded organizations, 2026-10-16). `rows` is the FIRST PAGE of
 * her organizations in the asked archive slice (ordered by last use; page size = the knob
 * `organizations.switcher_page_size`). `hasMore` true means more exist: page or search through
 * `iam.my_organizations_page` (`myOrganizationsPage.ts`), look one up by id through
 * `iam.my_organizations_by_ids` — never read them all.
 */
export type MemberOrganizationRows =
  | {
      ok: true;
      roleByOrgId: Map<string, string>;
      joinedAtByOrgId: Map<string, string>;
      memberCountByOrgId: Map<string, number>;
      rows: MemberOrganizationRow[];
      total: number;
      hasMore: boolean;
      nextCursor: string | null;
    }
  | { ok: false; stage: "memberships"; error: { message: string; code?: string } }
  | { ok: false; stage: "organizations"; error: { message: string; code?: string; details?: string; hint?: string } };

const SHARED_MS = 5_000;
type SharedEntry = { userId: string; at: number; read: Promise<MemberOrganizationRows>; seededAt?: number };
const shared = new Map<OrganizationArchiveSlice, SharedEntry>();

/** Role and join date per organization, from her memberships (the server seed builds the same maps). */
export function membershipMaps(
  memberships: readonly { containerId: string; role: string; status: string; createdAt?: string | null }[],
): { roleByOrgId: Map<string, string>; joinedAtByOrgId: Map<string, string> } {
  const roleByOrgId = new Map<string, string>();
  const joinedAtByOrgId = new Map<string, string>();
  for (const m of memberships) {
    roleByOrgId.set(m.containerId, m.role);
    // Only an ACTIVE membership counts toward "oldest" (the ladder's last rung).
    if (m.status === "active" && m.createdAt) joinedAtByOrgId.set(m.containerId, m.createdAt);
  }
  return { roleByOrgId, joinedAtByOrgId };
}

/** One page of `iam.my_organizations_page` → the shared shape. */
export function memberRowsFromEntries(
  entries: readonly MyOrganizationEntry[],
  page: { total: number; hasMore: boolean; nextCursor: string | null },
): MemberOrganizationRows & { ok: true } {
  const { roleByOrgId, joinedAtByOrgId } = membershipMaps(
    entries.map((e) => ({ containerId: e.organization.id, role: e.role, status: e.status, createdAt: e.joinedAt })),
  );
  return {
    ok: true,
    roleByOrgId,
    joinedAtByOrgId,
    memberCountByOrgId: new Map(entries.map((e) => [e.organization.id, e.memberCount])),
    rows: entries.map((e) => e.organization),
    total: page.total,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  };
}

async function readOnce(archive: OrganizationArchiveSlice): Promise<MemberOrganizationRows> {
  // ONE fixed-URL call for any membership count — never a chunked read of every row.
  const answer = await readMyOrganizationsPage({ archive });
  if (!answer.ok) return { ok: false, stage: "organizations", error: answer.error };
  return memberRowsFromEntries(answer.page.entries, answer.page);
}

/** The first page of her organizations in `archive` (default: live ones) — one read, shared. */
export function readMemberOrganizationRows(archive: OrganizationArchiveSlice = "active"): Promise<MemberOrganizationRows> {
  const userId = requireUserId();
  drainBootSeeds(); // a streamed boot seed that has arrived answers first
  const held = shared.get(archive);
  if (held?.seededAt !== undefined) {
    // The first read turns the seed into an ordinary held read (aging from now, `SHARED_MS`).
    if (held.userId === userId && Date.now() - held.seededAt < SEED_MAX_AGE_MS) {
      held.seededAt = undefined;
      held.at = Date.now();
      return held.read;
    }
    shared.delete(archive);
  } else if (held && held.userId === userId && (held.at === 0 || Date.now() - held.at < SHARED_MS)) return held.read;
  const entry: SharedEntry = { userId, at: 0, read: Promise.resolve({ ok: false, stage: "organizations", error: { message: "not read yet" } }) };
  entry.read = readOnce(archive).then(
    (answer) => {
      if (answer.ok) entry.at = Date.now();
      else if (shared.get(archive) === entry) shared.delete(archive);
      return answer;
    },
    (thrown: unknown) => {
      if (shared.get(archive) === entry) shared.delete(archive);
      throw thrown;
    },
  );
  shared.set(archive, entry);
  return entry.read;
}

/**
 * The (core) layout already read her memberships and organization rows for this page load (the boot
 * seed): the boot's reads within `SEED_MAX_AGE_MS` are answered from them, and `forget` drops it
 * like any held read.
 */
export function primeMemberOrganizationRows(userId: string, answer: MemberOrganizationRows & { ok: true }): void {
  if (shared.has("active")) return; // a read already flew or landed
  shared.set("active", { userId, at: Date.now(), read: Promise.resolve(answer), seededAt: Date.now() });
}

/** A write that changed her organizations, or a refresh: the next read asks again. */
export function forgetMemberOrganizationRows(): void {
  shared.clear();
  dropUnreadBootSeeds(); // no boot seed outlives a write or refresh
}
