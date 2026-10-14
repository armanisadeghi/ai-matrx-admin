import { mergeEvidence } from "../evidence";
import { brandNameFromPayload, factEvidence, webFirstData } from "../firstData";
import type { BrandFact } from "../validate/queue";

// Recorded live on 2026-10-14 (run 363ea8bb, fullspecstaff.com): the site answers a bot wall, so the quick
// check and the page read found no name; the web step's own-site listing (out at +0.9 s) carried the
// publisher "Full Spectrum Search Group" — yet the Brand name row said "Looking…" until the facts agent
// finished at +106 s, and even then only the validation page saw the name.
const WEB_OUTPUT = {
  domain: "fullspecstaff.com",
  own_site_results: [
    {
      role: "domain",
      engine: "brave",
      result: {
        url: "https://fullspecstaff.com/skilled-nursing/contact-us/",
        title: "Contact Full Spectrum | Skilled Nursing Search",
        profile: { name: "Fullspecstaff", long_name: "fullspecstaff.com", url: "https://fullspecstaff.com/skilled-nursing/contact-us/" },
        article: {
          publisher: {
            url: "https://fullspecstaff.com",
            name: "Full Spectrum Search Group",
            type: "organization",
            thumbnail: { original: "https://fullspecstaff.com/wp-content/uploads/2022/04/Full-Spectrum-Search-Group.svg" },
          },
        },
        cluster: [
          {
            url: "https://fullspecstaff.com/",
            title: "Home",
            description:
              "Full Spectrum Search Group places C-suite and executive leaders across senior living, skilled nursing, home health &amp; hospice — permanent &amp; interim, nationwide.",
          },
        ],
      },
    },
    { role: "domain", result: { url: "https://other.example.com/x", article: { publisher: { type: "organization", name: "Someone Else", url: "https://other.example.com" } } } },
  ],
};

describe("webFirstData", () => {
  it("puts the listing's publisher name, logo and homepage description on screen from the web step alone", () => {
    const items = webFirstData(WEB_OUTPUT);
    const names = items.filter((i) => i.field === "name").map((i) => i.value);
    expect(names).toEqual(["Full Spectrum Search Group"]); // the re-cased address and another site's publisher are not names
    expect(items.find((i) => i.field === "logo")?.image_url).toContain("Full-Spectrum-Search-Group.svg");
    expect(items.find((i) => i.field === "description")?.value).toContain("home health & hospice");
    expect(items.every((i) => i.source.node === "web")).toBe(true);
  });

  it("is empty before the web step has an output", () => {
    expect(webFirstData(null)).toEqual([]);
    expect(webFirstData({ own_site_results: [] })).toEqual([]);
  });
});

describe("factEvidence", () => {
  const fact = (field: string, value: string, known_field: string | null, certainty = "likely"): BrandFact => ({
    key: `fact:${field}:${value.toLowerCase()}`, field, field_label: field, value, certainty, reason: "", evidence_urls: [], known_field,
  });

  it("merges the facts agent's name into the row already on screen — no reset, no duplicate", () => {
    const first = mergeEvidence(new Map(), webFirstData(WEB_OUTPUT));
    const later = factEvidence([fact("phone", "(866) 587-4112", "phone")], "Full Spectrum Search Group");
    const merged = mergeEvidence(first, later);
    const names = [...merged.values()].filter((i) => i.field === "name");
    expect(names).toHaveLength(1);
    expect(names[0].source.node).toBe("web"); // the first row stays (higher confidence wins, equal keys merge)
    expect([...merged.values()].find((i) => i.field === "phone")?.key).toBe("phone:8665874112");
  });

  it("reads brand_name from the facts step's output wherever it sits", () => {
    expect(brandNameFromPayload({ structured_output: { result: { __kind: "brand_basics", brand_name: "Full Spectrum Search Group", items: [] } } })).toBe(
      "Full Spectrum Search Group",
    );
    expect(brandNameFromPayload({ content: "no kind here" })).toBeNull();
  });
});
