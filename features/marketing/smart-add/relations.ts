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
import {
  createBrandExclusions,
  createDiscoveredCandidates,
  type BrandRelationKind,
} from "@/features/marketing/data/service";
import { resolveParty } from "@/features/crm/service";
import { associationsService } from "@/features/scopes/service/associationsService";
import { extractErrorMessage } from "@/utils/errors";
import {
  candidateCategory,
  websiteHost,
  type Candidate,
  type Decision,
  type EvidenceItem,
  type Relation,
} from "./evidence";
import { personPartyInput } from "./personParty";
import { webAddress, type SuggestContext, type WebChoice, type WebSuggestion } from "./webKinds";

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
 * A person (founder / key person) goes to their home: the CRM party (an existing match is linked,
 * else one is created) plus the party → brand association with the relationship as its role. The
 * one path Create and the brand page's "Add person" share.
 */
export async function linkPersonToBrand(
  organizationId: string,
  brandId: string,
  name: string,
  relation: { routesTo: string; label: string },
  c: { url?: string | null; platform?: string | null; bio?: string | null },
  source = "smart_add",
): Promise<{ partyId: string; home: string }> {
  const party = await resolveParty(personPartyInput(organizationId, name, relation.label, c));
  const linked = await associationsService.add({
    sourceType: "party",
    sourceId: party.partyId,
    targetType: "web_brand",
    targetId: brandId,
    orgId: organizationId,
    role: relation.routesTo,
    metadata: { title: relation.label, source, url: c.url ?? null },
  });
  if (!linked.ok) throw new Error(linked.error.message);
  return { partyId: party.partyId, home: `platform.associations:${relation.routesTo}` };
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
    const route = relation.routesTo;
    if (route === "owns" || route === "key_person") {
      try {
        const person = await linkPersonToBrand(organizationId, brandId, name, { routesTo: route, label: relation.label }, c);
        resolved = { party_id: person.partyId, home: person.home };
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
            ...(i.hits?.length ? { search: { engines: i.engines ?? [], hits: i.hits, snippet: i.snippet ?? null } } : {}),
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

// ── The "On the web" step: every web result the person answered ─────────────────────

/** A web result as a compare candidate, so a founder's/key person's page routes like an account does. */
export function webCandidate(item: EvidenceItem): Candidate {
  const url = item.url ?? item.value;
  return {
    id: item.key,
    platform: "website",
    anchor: item,
    items: [item],
    ownKeys: [item.key],
    name: item.label,
    handle: null,
    url,
    followers: null,
    verified: null,
    bio: item.snippet ?? null,
    profileId: null,
    photoUrl: null,
    iconUrl: item.image_url,
  };
}

/** A web result's site, when it is a site of its own (its root page): the brand's next website. */
export function webSiteRoot(item: EvidenceItem): string | null {
  const address = webAddress(item.url ?? item.value);
  return address.includes("/") ? null : `https://${address}`;
}

/**
 * After the brand exists: every answered web result is kept on web.discovered_item with its answer
 * (relation_key), sentiment, and where it was found (engines, ranks, queries, the rule suggestion
 * shown); "Not us" also lands on the brand's exclusion list (web.brand_exclusion, the NO LIST seed).
 * Results answered founder / key person are routed by routeRelated (people); this saves the rest.
 * Ours → the caller adds a new site; competitor → the caller adds it to profile.competitors.
 */
export async function routeWebChoices(
  organizationId: string,
  brandId: string,
  items: EvidenceItem[],
  choices: Record<string, WebChoice>,
  kinds: BrandRelationKind[],
  suggestions: Record<string, WebSuggestion | null>,
  /** Founder / Key person results the person gave no name for: kept as plain found pages, not people. */
  unnamedPeople: ReadonlySet<string> = new Set(),
): Promise<{ keys: Set<string>; problems: string[] }> {
  const keys = new Set<string>();
  const problems: string[] = [];
  const at = new Date().toISOString();
  const byKey = new Map(kinds.map((k) => [k.key, k]));
  const answered = items
    .map((item) => ({ item, choice: choices[item.key], kind: byKey.get(choices[item.key]?.kind ?? "") }))
    .filter((x): x is { item: EvidenceItem; choice: WebChoice; kind: BrandRelationKind } => Boolean(x.choice && x.kind))
    .filter(({ item, kind }) => unnamedPeople.has(item.key) || (kind.routesTo !== "owns" && kind.routesTo !== "key_person"));
  if (!answered.length) return { keys, problems };
  try {
    await createDiscoveredCandidates(
      answered.map(({ item: i, choice, kind }) => ({
        organizationId,
        brandId,
        source: "smart_add",
        category: candidateCategory(i.field),
        guessedKind: i.field === "listing" || i.field === "mention" ? (i.platform ?? i.field) : i.field,
        url: i.url ?? i.value,
        value: { text: i.value, label: i.label, host: i.handle, snippet: i.snippet ?? null } as Json,
        context: {
          where: i.source.where,
          found_on: i.source.url,
          step: i.source.node,
          search: { engines: i.engines ?? [], hits: i.hits ?? [], snippet: i.snippet ?? null },
          relationship: {
            key: kind.key,
            label: kind.label,
            stance: kind.stance,
            routes_to: kind.routesTo,
            by: "person",
            at,
            suggested: suggestions[i.key] ?? null,
          },
        } as Json,
        confidence: i.confidence,
        relationKey: kind.key,
        sentiment: kind.hasSentiment ? (choice.sentiment ?? null) : null,
      })),
    );
    for (const { item } of answered) keys.add(item.key);
  } catch (error) {
    problems.push(`On the web: ${extractErrorMessage(error)}`);
  }
  const notUs = answered.filter(({ kind }) => kind.routesTo === "exclusion");
  try {
    await createBrandExclusions(
      notUs.map(({ item: i, kind }) => {
        const root = webSiteRoot(i);
        return {
          organizationId,
          brandId,
          matchKind: root ? ("host" as const) : ("url" as const),
          matchValue: root ? websiteHost(root) : webAddress(i.url ?? i.value),
          url: i.url ?? i.value,
          label: i.label,
          context: { from: "smart_add.web", hits: i.hits ?? [], suggested: suggestions[i.key] ?? null, at } as Json,
          relationKey: kind.key,
        };
      }),
    );
  } catch (error) {
    problems.push(`Not us list: ${extractErrorMessage(error)}`);
  }
  return { keys, problems };
}

/** The accounts and sites the person answered "Not us" in the compare rows, on the exclusion list too. */
export async function excludeNotUs(
  organizationId: string,
  brandId: string,
  items: EvidenceItem[],
  decisions: Record<string, Decision>,
  /** Person anchors answered "Namesake": kept on the list with that relation, not "not_us". */
  namesakes: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  const at = new Date().toISOString();
  const rows = items
    .filter((i) => decisions[i.key] === "no" && (i.field === "social" || i.field === "website" || i.field === "name"))
    .map((i) => ({
      organizationId,
      brandId,
      matchKind: i.field === "social" ? ("account" as const) : i.field === "name" ? ("name" as const) : ("host" as const),
      matchValue: i.field === "social" ? i.key : i.field === "name" ? i.value.trim().toLowerCase() : websiteHost(i.value),
      url: i.url ?? (i.field === "name" ? null : i.value),
      label: i.label ?? i.value,
      context: { from: "smart_add.compare", where: i.source.where, at } as Json,
      relationKey: namesakes.has(i.key) ? "namesake" : "not_us",
    }));
  try {
    await createBrandExclusions(rows);
    return [];
  } catch (error) {
    return [`Not us list: ${extractErrorMessage(error)}`];
  }
}

/** The facts the suggestion rules read, from what the person confirmed so far. */
export function suggestContext(
  websites: (string | null)[],
  accountUrls: (string | null)[],
  name: string | null,
  found: { accounts?: (string | null)[]; handles?: (string | null)[]; place?: string | null } = {},
): SuggestContext {
  const handle = (h: string | null) => (h ?? "").replace(/^@/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    foundAccounts: (found.accounts ?? []).filter((u): u is string => Boolean(u)).map(webAddress),
    ourHandles: [...new Set([...(found.handles ?? []).map(handle), ...accountUrls.map((u) => handle(webAddress(u ?? "").split("/")[1] ?? ""))].filter(Boolean))],
    ourHosts: [...new Set(websites.filter((u): u is string => Boolean(u)).map((u) => websiteHost(u).replace(/^www\./, "")))],
    ourAccounts: accountUrls.filter((u): u is string => Boolean(u)).map(webAddress),
    name,
    place: found.place || null,
  };
}
