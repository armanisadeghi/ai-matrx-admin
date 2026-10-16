/**
 * The usage-class guard (Arman, 2026-10-15): a match_only thing (Former, Misspelled, Broken link…) is kept for
 * matching but never reaches a marketing read — the brand's accounts, the agents' brand context, the menus' "ours".
 */
import type { BrandProperty } from "@/features/marketing/types";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { buildBrandContextXml } from "@/features/marketing/lib/surface-context";
import { relationWayOut } from "@/features/marketing/smart-add/SmartAddExtras";
import { reviewChoicesOf } from "@/features/marketing/smart-add/SmartAddWebRow";
import {
  isMarketingProperty,
  marketingProperties,
  nonMarketingRelationKeys,
  propertyMatchOnlyReason,
} from "../relation-usage";

const prop = (id: string, status: string, metadata: Record<string, unknown> = {}) =>
  ({
    id,
    kind: "youtube",
    url: `https://www.youtube.com/channel/${id}`,
    handle: id,
    display_name: null,
    status,
    deleted_at: null,
    metadata,
  }) as unknown as BrandProperty;

const kind = (key: string, stance: BrandRelationKind["stance"], usage: BrandRelationKind["usage"]): BrandRelationKind => ({
  id: key,
  key,
  label: key,
  routesTo: null,
  isKnown: true,
  stance,
  description: null,
  hasSentiment: false,
  usage,
  match: { hosts: [], paths: [], categories: [] },
});

const LIVE = prop("UClive", "active");
const DEAD = prop("UCdead", "match_only", { relation: { key: "broken_link", label: "Broken link", reason: "This channel does not exist." } });

describe("usage class", () => {
  it("the marketing read drops a match_only property; the match read keeps it", () => {
    const all = [LIVE, DEAD];
    expect(marketingProperties(all).map((p) => p.id)).toEqual(["UClive"]);
    // Matching reads every live row (listBrandPropertiesForMatching): the dead link is still an identity signal.
    expect(all.filter((p) => !p.deleted_at).map((p) => p.id)).toEqual(["UClive", "UCdead"]);
    expect(isMarketingProperty(DEAD)).toBe(false);
    expect(propertyMatchOnlyReason(DEAD)).toMatchObject({ key: "broken_link", label: "Broken link", reason: "This channel does not exist." });
    expect(propertyMatchOnlyReason(LIVE)).toBeNull();
  });

  it("agents never get a match_only property in the brand context", () => {
    const xml = buildBrandContextXml({ brand: { id: "b", name: "Acme", profile: {} } as never, properties: [LIVE, DEAD] });
    expect(xml).toContain("UClive");
    expect(xml).not.toContain("UCdead");
  });

  it("non-use kinds are named for marketing filters", () => {
    expect(nonMarketingRelationKeys([kind("mention", "about_us", "use"), kind("former_account", "ours", "match_only"), kind("maybe", "about_us", "undecided")])).toEqual([
      "former_account",
      "maybe",
    ]);
  });

  it("menus offer Former / Maybe under their own groups, never under Ours", () => {
    const kinds = [
      kind("ours", "ours", "use"),
      kind("former_account", "ours", "match_only"),
      kind("broken_link", "ours", "match_only"),
      kind("maybe", "about_us", "undecided"),
      kind("mention", "about_us", "use"),
      kind("not_us", "not_us", "use"),
    ];
    const groups = Object.fromEntries(reviewChoicesOf(kinds).map((c) => [c.key, c.group]));
    expect(groups).toMatchObject({ ours: "Ours", former_account: "Kept for matching", broken_link: "Kept for matching", maybe: "Not sure", mention: "About us" });
    const related = relationWayOut(kinds).map((i) => i.value);
    // The account row's Related menu: ours-in-use is its own Yes; Former / Broken link / Maybe are offered.
    expect(related).toEqual(expect.arrayContaining(["rel:former_account", "rel:broken_link", "rel:maybe"]));
    expect(related).not.toContain("rel:ours");
  });
});
