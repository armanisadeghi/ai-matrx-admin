/**
 * The brand's key people and the Spokesperson flag on their party -> brand edge.
 *
 * The flag is `metadata.is_spokesperson` on the `platform.associations` edge (what aidream's brand reader flags).
 * Writing it goes through `associationsService.add`: `assoc_add` is idempotent and, on an existing edge, REPLACES the
 * metadata with what is sent - so a metadata update is an `add` with the full merged metadata. `replaceMetadata` is NOT
 * sent: the service accepts that flag only for file conversation attachments (merge-by-default edges) and refuses it
 * for every other edge, which made the switch fail on party -> brand edges.
 */

import { associationsService } from "@/features/scopes/service/associationsService";

export interface Person {
  partyId: string;
  name: string;
  role: string;
  metadata: Record<string, unknown>;
}

export const brandPeopleKey = (brandId: string) => ["marketing", "brand-people", brandId] as const;

export async function setSpokespersonEdge(
  brand: { id: string; organization_id: string },
  person: Person,
  on: boolean,
): Promise<void> {
  const res = await associationsService.add({
    sourceType: "party",
    sourceId: person.partyId,
    targetType: "web_brand",
    targetId: brand.id,
    orgId: brand.organization_id,
    role: person.role,
    metadata: { ...person.metadata, is_spokesperson: on },
  });
  if (!res.ok) throw new Error(res.error.message);
}
