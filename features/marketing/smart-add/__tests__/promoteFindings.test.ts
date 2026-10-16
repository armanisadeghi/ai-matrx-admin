// Arman 2026-10-16: "We are getting all of the competitors identified during the smart add process but then
// they're clearly not being added when you get to the brand page." Create kept every rival in
// web.brand.profile.competitors; the Competitors page reads seo.competitor (through the brand's sites) and never
// read that list, so 13 of 46 Smart Add brands showed zero competitors while holding 2-8 each.
//
// This runs the real Create planning (the facts agent's rivals via planKeptFacts, the person's Related answers via
// relatedCompetitors) into the brand profile Create writes, then the ONE promotion path, and asserts every kept
// rival reaches a home the brand page reads.
import type { Json } from "@/types/database.types";
import { planKeptFacts } from "../keptFacts";
import { relatedCompetitors, type RelatedCandidate } from "../relations";
import type { BrandFact } from "../validate/queue";
import {
  PROMOTERS,
  profileCompetitors,
  promoteSmartAddFindings,
  type CompetitorHomeInsert,
  type PromoteDeps,
} from "../promote";

const fact = (field: string, value: string, key = `${field}:${value}`): BrandFact => ({
  key,
  field,
  field_label: field,
  value,
  certainty: "likely",
  reason: "fixture",
  evidence_urls: [],
  known_field: null,
});

/** One Smart Add result carrying every competitor shape Create produces. */
function createdProfile(): Json {
  const facts = [
    fact("competitor", "Eagle Cleaning"),
    fact("competitor", "Eagle Cleaning", "dup"), // the facts agent repeats itself across rounds
    fact("competitor", "Refused Rival"),
    fact("phone", "+1 555 0100"),
  ];
  const plan = planKeptFacts(facts, (f) => (f.value === "Refused Rival" ? "no" : undefined));
  const related = [
    { candidate: { platform: "website", url: "https://www.rivalclean.com/", name: "Rival Clean", handle: null }, relation: { key: "competitor", label: "Competitor", routesTo: "competitor" } },
    { candidate: { platform: "instagram", url: null, name: "Sparkle Co", handle: "sparkleco" }, relation: { key: "competitor", label: "Competitor", routesTo: "competitor" } },
    { candidate: { platform: "website", url: "https://ownsite.com", name: "Our other domain", handle: null }, relation: { key: "competitor", label: "Competitor", routesTo: "competitor" } },
  ] as unknown as RelatedCandidate[];
  const web = [{ name: "Rival Clean", domain: "rivalclean.com" }]; // the same rival answered again on the web step
  return { ...plan.profile, competitors: [...(plan.profile.competitors ?? []), ...relatedCompetitors(related), ...web] } as Json;
}

function memoryDeps(profile: Json, siteIds: string[] = ["site-1"]) {
  const table: CompetitorHomeInsert[] = [];
  const deps: PromoteDeps = {
    readBrand: async (id) => ({ id, organizationId: "org-1", profile }),
    listSites: async () => siteIds.map((id) => ({ id, host: "ownsite.com" })),
    listCompetitorDomains: async () => new Set(table.map((r) => r.domain)),
    insertCompetitors: async (rows) => {
      const ids: string[] = [];
      for (const r of rows) {
        if (table.some((t) => t.siteId === r.siteId && t.domain === r.domain)) continue;
        table.push(r);
        ids.push(`seo-${r.domain}`);
      }
      return ids;
    },
    deleteCompetitors: async (ids) => {
      for (const id of ids) {
        const i = table.findIndex((t) => `seo-${t.domain}` === id);
        if (i >= 0) table.splice(i, 1);
      }
    },
    actorId: async () => "user-1",
  };
  return { deps, table };
}

describe("Smart Add promotion: every kept finding reaches a home the brand page reads", () => {
  it("has a promoter for every promotable finding type", () => {
    expect(Object.keys(PROMOTERS).sort()).toEqual(["competitor"]);
  });

  it("a rival with a domain lands in seo.competitor; name/handle-only rivals stay on the brand for the page", async () => {
    const profile = createdProfile();
    const { deps, table } = memoryDeps(profile);
    const result = await promoteSmartAddFindings(deps, "brand-1");

    expect(table.map((r) => [r.siteId, r.domain, r.name])).toEqual([["site-1", "rivalclean.com", "Rival Clean"]]);
    expect(table[0]).toMatchObject({ organizationId: "org-1", createdBy: "user-1" });
    expect(result.landed.competitor).toBe(1);

    // What the Competitors page lists from the brand itself (listBrandCompetitors step 6).
    const kept = profileCompetitors(profile).map((c) => c.name);
    expect(kept).toEqual(expect.arrayContaining(["Eagle Cleaning", "Sparkle Co", "Rival Clean"]));
    expect(kept).not.toContain("Refused Rival"); // said No: never kept, never shown
    expect(kept.filter((n) => n === "Eagle Cleaning")).toHaveLength(1);
    // The brand's own domain answered "competitor" is never listed as a rival in seo.competitor.
    expect(table.some((r) => r.domain === "ownsite.com")).toBe(false);
  });

  it("is idempotent: a second run (Refresh, a later answer, the backfill) writes nothing", async () => {
    const { deps, table } = memoryDeps(createdProfile());
    await promoteSmartAddFindings(deps, "brand-1");
    const again = await promoteSmartAddFindings(deps, "brand-1");
    expect(table).toHaveLength(1);
    expect(again.landed.competitor).toBe(0);
    expect(again.alreadyHome.competitor).toBe(1);
  });

  it("undo removes only the rows the promotion created, never a row a person already had", async () => {
    const { deps, table } = memoryDeps(createdProfile());
    table.push({ siteId: "site-1", organizationId: "org-1", createdBy: "person", domain: "rivalclean.com", name: "Rival Clean" });
    const first = await promoteSmartAddFindings(deps, "brand-1");
    expect(first.createdIds.competitor).toEqual([]); // the person's row already covers it
    await deps.deleteCompetitors(first.createdIds.competitor);
    expect(table.map((r) => r.createdBy)).toEqual(["person"]);

    const fresh = memoryDeps(createdProfile());
    const made = await promoteSmartAddFindings(fresh.deps, "brand-1");
    expect(made.createdIds.competitor).toEqual(["seo-rivalclean.com"]);
    await fresh.deps.deleteCompetitors(made.createdIds.competitor);
    expect(fresh.table).toHaveLength(0);
  });

  it("a brand with no site keeps every rival on the brand (nothing lost, nothing written)", async () => {
    const { deps, table } = memoryDeps(createdProfile(), []);
    const result = await promoteSmartAddFindings(deps, "brand-1");
    expect(table).toHaveLength(0);
    expect(result.keptOnBrand.competitor).toBe(profileCompetitors(createdProfile()).length);
  });
});
