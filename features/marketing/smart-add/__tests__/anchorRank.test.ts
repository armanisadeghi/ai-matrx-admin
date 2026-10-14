import type { EvidenceItem } from "../evidence";
import { anchorScore, rankByAnchors } from "../anchorRank";

const fb = (key: string, label: string, bio: string | null, location: string | null): EvidenceItem =>
  ({
    key,
    field: "social",
    value: `https://www.facebook.com/${key}`,
    label,
    image_url: null,
    url: `https://www.facebook.com/${key}`,
    platform: "facebook",
    handle: key,
    followers: null,
    verified: null,
    profile_id: null,
    source: { kind: "web", url: null } as unknown as EvidenceItem["source"],
    confidence: 0.5,
    anchor: { display_name: label, bio_line: bio, location, reasons: [], score: 1 } as unknown as EvidenceItem["anchor"],
  }) as EvidenceItem;

describe("rankByAnchors (Nancy Wright, 2026-10-14)", () => {
  const namesake = fb("nancy.wright.77", "Nancy Wright", "Grandma, gardener", "Tulsa, Oklahoma");
  const her = fb("nancydeanwrightcpa", "Nancy Dean Wright CPA", "Tax and accounting · nancywrightcpa.com", "Mission Viejo, California");
  const anchors = { city: "Rancho Santa Margarita", occupation: "CPA", foundHosts: ["https://nancywrightcpa.com"] };

  it("puts the account carrying the found site and the occupation first", () => {
    expect(rankByAnchors([namesake, her], anchors).map((i) => i.key)).toEqual(["nancydeanwrightcpa", "nancy.wright.77"]);
    expect(anchorScore(her, anchors)).toBeGreaterThanOrEqual(5);
  });

  it("drops a namesake who states another city and carries no anchor", () => {
    expect(anchorScore(namesake, anchors)).toBeLessThan(0);
  });

  it("keeps the incoming order when nothing is known", () => {
    expect(rankByAnchors([namesake, her], {}).map((i) => i.key)).toEqual(["nancy.wright.77", "nancydeanwrightcpa"]);
  });
});
