/**
 * Smart Add — "Related" candidates: an account or site that is neither the brand nor "not us"
 * (the founder's own page, a sister company, a competitor…). The relationship vocabulary is data
 * (`web.brand_relation_kind`); its `routes_to` names the canonical home each one lands in:
 *
 *   owns / key_person → a person party associated to the brand (platform.associations party → web_brand)
 *   competitor        → web.brand.profile.competitors ({name, domain, handles})
 *
 * Every related finding is also kept on `web.discovered_item` (status confirmed, `relation_key`,
 * provenance in `context.relationship`) so nothing is lost and custom values can be promoted later.
 */

import type { Json } from "@/types/database.types";
import type { BrandCompetitor } from "@/features/marketing/types";
import { createDiscoveredCandidates } from "@/features/marketing/data/service";
import { resolveParty } from "@/features/crm/service";
import { associationsService } from "@/features/scopes/service/associationsService";
import { extractErrorMessage } from "@/utils/errors";
import { candidateCategory, websiteHost, type Candidate, type Decision, type Relation } from "./evidence";

export interface RelatedCandidate {
  candidate: Candidate;
  relation: Relation;
}

function displayName(c: Candidate): string {
  if (c.name) return c.name;
  if (c.handle) return `@${c.handle}`;
  return c.url ? websiteHost(c.url) : c.anchor.value;
}

/** Competitors the person named in Compare, in the brand profile's own shape. */
export function relatedCompetitors(related: RelatedCandidate[]): BrandCompetitor[] {
  return related
    .filter((r) => r.relation.routesTo === "competitor")
    .map(({ candidate: c }) => ({
      name: displayName(c),
      ...(c.platform === "website" && c.url ? { domain: websiteHost(c.url) } : {}),
      ...(c.platform !== "website" && c.handle ? { handles: [`@${c.handle}`] } : {}),
    }));
}

/**
 * After the brand exists: people go to their home (party + association), then every related
 * finding is saved with its relationship. Returns the keys saved (so they are not saved again as
 * unreviewed) and any problem, by name.
 */
export async function routeRelated(
  organizationId: string,
  brandId: string,
  related: RelatedCandidate[],
  decisions: Record<string, Decision>,
): Promise<{ keys: Set<string>; problems: string[] }> {
  const keys = new Set<string>();
  const problems: string[] = [];
  const at = new Date().toISOString();
  for (const { candidate: c, relation } of related) {
    const name = displayName(c);
    let resolved: Record<string, string> = {};
    if (relation.routesTo === "owns" || relation.routesTo === "key_person") {
      try {
        const party = await resolveParty({
          kind: "person",
          displayName: name,
          orgId: organizationId,
          source: "smart_add",
          sourceDetail: `${relation.label}: ${c.url ?? name}`,
          ...(c.platform === "website" && c.url ? { primaryDomain: websiteHost(c.url) } : {}),
          ...(c.bio ? { headline: c.bio.slice(0, 200) } : {}),
        });
        const linked = await associationsService.add({
          sourceType: "party",
          sourceId: party.partyId,
          targetType: "web_brand",
          targetId: brandId,
          orgId: organizationId,
          role: relation.routesTo,
          metadata: { title: relation.label, source: "smart_add", url: c.url },
        });
        if (!linked.ok) throw new Error(linked.error.message);
        resolved = { party_id: party.partyId, home: `platform.associations:${relation.routesTo}` };
      } catch (error) {
        problems.push(`${name}: ${extractErrorMessage(error)}`);
      }
    } else if (relation.routesTo === "competitor") {
      resolved = { home: "web.brand.profile.competitors" };
    }
    const own = new Set(c.ownKeys);
    const saving = c.items.filter((i) => own.has(i.key) && !decisions[i.key] && !keys.has(i.key));
    try {
      await createDiscoveredCandidates(
        saving.map((i) => ({
          organizationId,
          brandId,
          source: "smart_add",
          category: candidateCategory(i.field),
          guessedKind: i.field === "social" ? (i.platform ?? "social") : i.field,
          url: i.url ?? (i.field === "logo" ? (i.image_url ?? i.value) : null),
          value: { text: i.value, label: i.label, handle: i.handle, followers: i.followers } as Json,
          context: {
            where: i.source.where,
            found_on: i.source.url,
            step: i.source.node,
            relationship: {
              key: relation.key,
              label: relation.label,
              routes_to: relation.routesTo,
              candidate: c.id,
              anchor: i.key === c.anchor.key,
              by: "person",
              at,
              ...resolved,
            },
          } as Json,
          confidence: i.confidence,
          relationKey: relation.key,
        })),
      );
      for (const i of saving) keys.add(i.key);
    } catch (error) {
      problems.push(`${name}: ${extractErrorMessage(error)}`);
    }
  }
  return { keys, problems };
}
