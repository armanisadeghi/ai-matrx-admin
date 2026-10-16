// features/organizations/service/memberOrganizationRows.ts — lane PAGE-BUNDLE-2
//
// HER ORGANIZATIONS ARE READ ONCE PER PAGE LOAD, NOT FOUR TIMES.
//
// Every page load read `iam.organizations` for the same person from three places a moment apart —
// the member list (`getUserOrganizations`, once per archive filter), the scope tree's skeleton and
// its whole tree — measured on production at 8 organization calls per page for admin@admin.com.
// They now share ONE read: her memberships, then EVERY organization row she is a member of
// (`select *`, archived included — each caller filters what it shows, as before). Shared while in
// flight and for SHARED_MS after it lands; a write that changes her organizations, or an explicit
// refresh, forgets it (`forgetMemberOrganizationRows`). A failed read is never shared past its flight.

import { supabase } from "@/utils/supabase/client";
import { requireUserId } from "@/utils/auth/getUserId";
import { membershipsService } from "@/features/organizations/service/membershipsService";
import { readInChunks } from "@/features/scopes/service/inChunks";
import { isRecordsErr } from "@ai-matrx/records";
import type { Database } from "@/types/database.types";
import { SEED_MAX_AGE_MS } from "@/lib/sharedReads";
import { drainBootSeeds } from "@/lib/boot/bootSeedSlot";

export type MemberOrganizationRow = Database["iam"]["Tables"]["organizations"]["Row"];

export type MemberOrganizationRows =
  | { ok: true; roleByOrgId: Map<string, string>; joinedAtByOrgId: Map<string, string>; rows: MemberOrganizationRow[] }
  | { ok: false; stage: "memberships"; error: { message: string; code?: string } }
  | { ok: false; stage: "organizations"; error: { message: string; code?: string; details?: string; hint?: string } };

const SHARED_MS = 5_000;
let shared: { userId: string; at: number; read: Promise<MemberOrganizationRows>; seededAt?: number } | null = null;

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

async function readOnce(): Promise<MemberOrganizationRows> {
  const memberships = await membershipsService.forUser("organization");
  if (isRecordsErr(memberships)) {
    return { ok: false, stage: "memberships", error: { message: memberships.error.message, code: memberships.error.code } };
  }
  const { roleByOrgId, joinedAtByOrgId } = membershipMaps(memberships.data.memberships);
  const orgIds = [...roleByOrgId.keys()];
  if (orgIds.length === 0) return { ok: true, roleByOrgId, joinedAtByOrgId, rows: [] };
  // ONE GET url carries ~100 ids, not a person's ~1000 memberships: read in chunks.
  const { data, error } = await readInChunks(orgIds, (chunk) =>
    supabase.schema("iam").from("organizations").select("*").in("id", chunk),
  );
  if (error) {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    return { ok: false, stage: "organizations", error: { message: e.message ?? "The organizations could not be read.", code: e.code, details: e.details, hint: e.hint } };
  }
  return { ok: true, roleByOrgId, joinedAtByOrgId, rows: (data ?? []) as MemberOrganizationRow[] };
}

/** Her memberships and every organization row she is a member of — one read, shared. */
export function readMemberOrganizationRows(): Promise<MemberOrganizationRows> {
  const userId = requireUserId();
  drainBootSeeds(); // a streamed boot seed that has arrived answers first
  const held = shared;
  if (held?.seededAt !== undefined) {
    if (held.userId === userId && Date.now() - held.seededAt < SEED_MAX_AGE_MS) return held.read;
    shared = null;
  } else if (held && held.userId === userId && (held.at === 0 || Date.now() - held.at < SHARED_MS)) return held.read;
  const entry: { userId: string; at: number; read: Promise<MemberOrganizationRows> } = { userId, at: 0, read: Promise.resolve({ ok: true, roleByOrgId: new Map(), joinedAtByOrgId: new Map(), rows: [] }) };
  entry.read = readOnce().then(
    (answer) => {
      if (answer.ok) entry.at = Date.now();
      else if (shared === entry) shared = null;
      return answer;
    },
    (thrown: unknown) => {
      if (shared === entry) shared = null;
      throw thrown;
    },
  );
  shared = entry;
  return entry.read;
}

/**
 * The (core) layout already read her memberships and organization rows for this page load (the boot
 * seed): the boot's reads within `SEED_MAX_AGE_MS` are answered from them, and `forget` drops it
 * like any held read.
 */
export function primeMemberOrganizationRows(userId: string, answer: MemberOrganizationRows & { ok: true }): void {
  if (shared) return; // a read already flew or landed
  shared = { userId, at: Date.now(), read: Promise.resolve(answer), seededAt: Date.now() };
}

/** A write that changed her organizations, or a refresh: the next read asks again. */
export function forgetMemberOrganizationRows(): void {
  shared = null;
}
