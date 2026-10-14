import type { ResolvePartyInput } from "@/features/crm/service";

/**
 * The party a founder / key-person answer resolves to. A person party can never carry a
 * primary_domain (crm.party `party_org_facet`: that column belongs to organizations, and the
 * database refuses the whole save), so the page they were found on rides in attributes instead.
 */
export function personPartyInput(
  organizationId: string,
  name: string,
  relationLabel: string,
  c: { url?: string | null; platform?: string | null; bio?: string | null },
): ResolvePartyInput {
  return {
    kind: "person",
    displayName: name,
    orgId: organizationId,
    source: "smart_add",
    sourceDetail: `${relationLabel}: ${c.url ?? name}`,
    ...(c.platform === "website" && c.url ? { attributes: { website: c.url } } : {}),
    ...(c.bio ? { headline: c.bio.slice(0, 200) } : {}),
  };
}
