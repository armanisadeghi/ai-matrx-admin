// lib/records/clientInOrganization.ts — a records client that speaks for ONE organization: the one a row
// LIVES in. Every by-id door of the record store (history, restore preview, version read) takes the
// client's organization as `p_organization_id`; a row read through a client bound to a different
// organization answers EMPTY, not refused (2026-10-22 audit: layout History was a blank popover for every
// person whose layout row lives outside the active organization). So a by-id read or write of a stored
// row goes through `clientInOrganization(client, row.organizationId)` — never the page's client as-is.
//
// The same rule the package applies inside `upsertAppRow` / `removeAppRow` (its private `clientIn`):
// same organization → the same client; otherwise one sibling client per organization, reused.

import { createRecordsClient, type RecordsClient } from "@ai-matrx/records/core";

const siblings = new WeakMap<RecordsClient, Map<string, RecordsClient>>();

export function clientInOrganization<C extends RecordsClient>(client: C, organizationId: string | null | undefined): C {
  if (!organizationId || organizationId === client.config.organizationId) return client;
  let byOrg = siblings.get(client);
  if (!byOrg) siblings.set(client, (byOrg = new Map()));
  let sibling = byOrg.get(organizationId);
  if (!sibling) {
    sibling = createRecordsClient({ ...client.config, organizationId, organizationIds: [] });
    byOrg.set(organizationId, sibling);
  }
  return sibling as C;
}
