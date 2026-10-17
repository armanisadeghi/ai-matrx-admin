// features/organizations/service/organizationLookup.ts — "IS THIS ORGANIZATION MINE?" AND "WHAT IS IT CALLED?"
// ASKED BY ID, NEVER BY READING ALL OF HER ORGANIZATIONS (bounded organizations, 2026-10-17).
//
// A person may be in hundreds of organizations; the store holds only the first page of them. A
// screen that labels a record's organization, or asks whether she is a member of one, must not look
// the answer up in that page — it asks `iam.my_organizations_by_ids` for the ids it is showing.
// ONE shared cache per tab: every id asked once (members AND "not hers" answers), concurrent asks in
// the same tick coalesce into one call (≤ 500 ids each), pages the store already holds seed it for free.
// Archived organizations are answered (the caller decides what archived means to it).

import { getMyOrganizationsByIds } from "@/features/organizations/service";
import { onMemberOrganizationsForgotten } from "@/features/organizations/service/memberOrganizationRows";
import type { OrganizationWithRole } from "@/features/organizations/types";

const BATCH = 500;

/** id → her organization, or null when she is not a member of it. */
const known = new Map<string, OrganizationWithRole | null>();
const failed = new Set<string>();
const inflight = new Map<string, Promise<void>>();
let queue: Set<string> | null = null;
let flushing: Promise<void> | null = null;
const listeners = new Set<() => void>();
let version = 0;

function bump(): void {
  version += 1;
  for (const l of listeners) l();
}

export function subscribeOrganizationLookup(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function organizationLookupVersion(): number {
  return version;
}

/** Same organization by value (a fresh object carrying the same fields is not news). */
function sameOrganization(a: OrganizationWithRole | null | undefined, b: OrganizationWithRole): boolean {
  if (a === b) return true;
  if (!a) return false;
  const ak = Object.keys(a) as (keyof OrganizationWithRole)[];
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => Object.is(a[k], b[k]));
}

/**
 * Pages / searches the store already holds are answers too: no call for an id they carry.
 * Stable against fresh-but-equal arrays and objects: only a real change bumps (a bump re-renders
 * every subscriber, so bumping on equal data would loop a caller that remembers during render).
 */
export function rememberOrganizations(orgs: readonly OrganizationWithRole[]): void {
  let changed = false;
  for (const org of orgs) {
    if (!sameOrganization(known.get(org.id), org)) {
      known.set(org.id, org);
      changed = true;
    }
  }
  if (changed) bump();
}

/** The last read for this id failed (so it is neither a member nor a non-member yet). */
export function lookupFailed(id: string): boolean {
  return failed.has(id);
}

/** What is known right now: the organization, null = not hers, undefined = not asked yet. */
export function peekOrganization(id: string): OrganizationWithRole | null | undefined {
  return known.get(id);
}

function flush(): Promise<void> {
  if (flushing) return flushing;
  flushing = Promise.resolve().then(async () => {
    const ids = [...(queue ?? [])];
    queue = null;
    flushing = null;
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      try {
        const found = await getMyOrganizationsByIds(chunk);
        const byId = new Map(found.map((o) => [o.id, o] as const));
        for (const id of chunk) {
          known.set(id, byId.get(id) ?? null);
          failed.delete(id);
        }
      } catch {
        // A failed read is not "not a member": the ids stay unknown (named in `lookupFailed`).
        for (const id of chunk) failed.add(id);
      }
      for (const id of chunk) inflight.delete(id);
    }
    bump();
  });
  return flushing;
}

/**
 * Ask about these ids (uuids only). Resolves when each is answered. Ids already known are free.
 * Failure leaves an id unknown (`peekOrganization` → undefined), never a false "not a member".
 */
export async function lookupOrganizations(ids: readonly (string | null | undefined)[]): Promise<Map<string, OrganizationWithRole>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const waits: Promise<void>[] = [];
  for (const id of wanted) {
    if (known.has(id)) continue;
    failed.delete(id);
    let pending = inflight.get(id);
    if (!pending) {
      (queue ??= new Set()).add(id);
      pending = flush();
      inflight.set(id, pending);
    }
    waits.push(pending);
  }
  await Promise.all(waits);
  const out = new Map<string, OrganizationWithRole>();
  for (const id of wanted) {
    const org = known.get(id);
    if (org) out.set(id, org);
  }
  return out;
}

/** True / false once answered; null when the read failed (callers then ask the door as before). */
export async function isMemberOfOrganization(id: string): Promise<boolean | null> {
  await lookupOrganizations([id]);
  const org = known.get(id);
  if (org === undefined) return null;
  return org !== null;
}

/** Session boundary / membership write: nothing learned survives. */
export function forgetOrganizationLookups(): void {
  known.clear();
  failed.clear();
  inflight.clear();
  queue = null;
  bump();
}

onMemberOrganizationsForgotten(forgetOrganizationLookups);
