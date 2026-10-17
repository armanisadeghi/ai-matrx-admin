// features/organizations/organizationsIAmIn.ts — LANE GATES-TAIL (VERIFIER-21 #7); bounded 2026-10-17.
//
// "IS SHE IN THIS ORGANIZATION?" — for the reads that only a member may make (a roster, an
// organization's knobs). Access is personal: a person can be given a table of an organization she is
// not in, and every open of it asked those member-only doors about that organization and was refused
// with 403 (`iam.has_org_access_for`: direct membership). Such a read is not hers to make, so it is
// not asked for.
//
// BOUNDED ORGANIZATIONS (2026-10-17): she may be in hundreds, and the store holds only a page of them.
// So membership is asked BY ID (`iam.my_organizations_by_ids`, shared + cached in
// `organizationLookup`) — never answered by looking in a list. Null when the read failed — the caller
// then asks as before and lets the door answer.
//
// AN ARCHIVED ORGANIZATION IS NOT ONE SHE IS IN (2026-10-08). Her membership rows are kept when an
// organization is archived (so a restore gives everything back), but `iam.has_org_access_for` closes
// it — every member-only door refuses it with 403.

import { forgetOrganizationLookups, isMemberOfOrganization, lookupOrganizations } from "@/features/organizations/service/organizationLookup";
import { readMemberOrganizationRows } from "@/features/organizations/service/memberOrganizationRows";

/** True when she is a live member of `organizationId`; null when that could not be read. */
export async function memberOfLiveOrganization(organizationId: string): Promise<boolean | null> {
  const found = await lookupOrganizations([organizationId]);
  const org = found.get(organizationId);
  if (org) return !org.archivedAt;
  return isMemberOfOrganization(organizationId); // false (not hers) or null (read failed)
}

/** False only when her membership was read and `organizationId` is not a live one of hers. */
export async function mayReadAsMember(organizationId: string): Promise<boolean> {
  const mine = await memberOfLiveOrganization(organizationId);
  return mine === null || mine;
}

/**
 * The live organizations she used most recently — THE FIRST PAGE, never all of them. For a screen
 * that must gather something across "her organizations" and has no server-side way to ask without
 * ids (study kits): it covers this page, and says so (`hasMore`). Null when they could not be read.
 */
export async function recentOrganizationIds(): Promise<{ ids: Set<string>; hasMore: boolean } | null> {
  try {
    const r = await readMemberOrganizationRows();
    if (!r.ok) return null;
    return { ids: new Set(r.rows.filter((row) => !row.archived_at).map((row) => row.id)), hasMore: r.hasMore };
  } catch {
    return null;
  }
}

/**
 * Which of THESE organizations is she a live member of? For a screen holding records that name
 * their organization (an organization-owned connection) — never the scope tree, never all of her
 * organizations. The boot-seeded first page answers for free; only ids it cannot answer (it has
 * more pages, or it failed) are asked by id (`iam.my_organizations_by_ids`, shared + cached).
 * An id whose read failed is left out (unknown is not "hers").
 */
export async function liveOrganizationIdsAmong(ids: readonly (string | null | undefined)[]): Promise<string[]> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return [];
  const page = await recentOrganizationIds();
  const mine = new Set<string>();
  const ask: string[] = [];
  for (const id of wanted) {
    if (page?.ids.has(id)) mine.add(id);
    else if (!page || page.hasMore) ask.push(id);
  }
  if (ask.length > 0) {
    const found = await lookupOrganizations(ask);
    for (const [id, org] of found) if (!org.archivedAt) mine.add(id);
  }
  return wanted.filter((id) => mine.has(id));
}

/**
 * Ask a member-only door ONLY when she is a member of `organizationId`; otherwise
 * answer `otherwise` without a request. Used for reads keyed by a RECORD's
 * organization (a record page's custom fields, its record chat): a record shared
 * with her from an organization she is not in asked `platform.unified_data_store_on`
 * and drew a 403 on every load (page-pass 2026-09-27, /crm/<id>).
 */
export async function askAsMember<T>(
  organizationId: string | null | undefined,
  ask: () => Promise<T>,
  otherwise: T,
): Promise<T> {
  if (organizationId && !(await mayReadAsMember(organizationId))) return otherwise;
  return ask();
}

/** Test seam. */
export function __resetOrganizationsIAmInForTest(): void {
  forgetOrganizationLookups();
}
