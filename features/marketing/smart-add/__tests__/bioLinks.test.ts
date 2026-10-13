import { bioLinkGroups, parseEvidenceItem } from "../evidence";

const raw = (over: Record<string, unknown> = {}) => ({
  key: "bio_link:fullspecstaff.com/senior-living-jobs",
  field: "bio_link",
  value: "https://fullspecstaff.com/senior-living-jobs/",
  label: "Full Spectrum Job Board",
  url: "https://fullspecstaff.com/senior-living-jobs/",
  source: { node: "socials", kind: "link_in_bio", url: "https://linktr.ee/fullspecstaff", where: "from Linktree bio" },
  confidence: 0.5,
  ...over,
});

describe("link-in-bio links", () => {
  it("a bio_link item from the server is read, not dropped", () => {
    expect(parseEvidenceItem(raw())?.field).toBe("bio_link");
  });
  it("they group by the page they came from, in page order", () => {
    const items = [raw(), raw({ key: "bio_link:b", value: "https://b.example/x" }), raw({ key: "bio_link:c", source: { node: "socials", kind: "link_in_bio", where: "from Stan Store bio" } })]
      .map(parseEvidenceItem)
      .filter((i): i is NonNullable<typeof i> => i !== null);
    const groups = bioLinkGroups(items);
    expect(groups.map((g) => g.from)).toEqual(["from Linktree bio", "from Stan Store bio"]);
    expect(groups[0].links).toHaveLength(2);
  });
});
