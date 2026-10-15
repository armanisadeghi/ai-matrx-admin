import { mergeEvidence } from "../evidence";
import { brandNameFromPayload, factEvidence, factSlotKey, typedWebsiteItem, webFirstData } from "../firstData";
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

// Recorded live on 2026-10-15 (run 0f75b0ca, a coffee roaster typed as its website): the site answered 403 and the
// scraper timed out, so the page read found nothing — yet the facts agent found the website [confirmed], a logo, two
// taglines and a short description. Websites, Logo & images and About all said "Nothing found".
describe("an unreadable site still fills its slots", () => {
  const recorded = (field: string, value: string, certainty: string, url: string): BrandFact => ({
    key: `fact:${field}:${value.toLowerCase()}`, field, field_label: field, value, certainty, reason: `${field} from ${url}`,
    evidence_urls: [url], known_field: "true",
  });
  const FACTS = [
    recorded("website", "https://www.dynamiteroasting.com", "confirmed", "https://www.dynamiteroasting.com/contact/"),
    recorded("logo_url", "https://media.licdn.com/dms/image/C4D0/company-logo_200_200/0/1630550424733/logo?e=2147483647&amp;v=beta", "likely", "https://www.linkedin.com/company/x"),
    recorded("tagline", "Pow! Coffee Now!", "likely", "https://www.facebook.com/x/"),
    recorded("tagline", "Coffee for Everyone!", "likely", "https://incredibletowns.com/x/"),
    recorded("short_description", "Amazing Fairtrade & Organic coffee roasted in the mountains of North Carolina.", "likely", "https://www.linkedin.com/company/x"),
    recorded("business_category", "Coffee shop", "likely", "https://www.facebook.com/x/"),
  ];

  it("the typed website is a Websites row before anything is read, under the server's own key", () => {
    const site = typedWebsiteItem("dynamiteroasting.com");
    expect(site?.key).toBe("website:dynamiteroasting.com");
    expect(site?.field).toBe("website");
    expect(site?.source.where).toBe("the address itself");
    expect(typedWebsiteItem("linktr.ee/someone")).toBeNull();
    expect(typedWebsiteItem("")).toBeNull();
  });

  it("the facts agent's website, logo, taglines, description and category land in their slots with their certainty", () => {
    const rows = factEvidence(FACTS, null);
    const of = (f: string) => rows.filter((i) => i.field === f);
    expect(of("website").map((i) => [i.key, i.certainty])).toEqual([["website:dynamiteroasting.com", "certain"]]);
    expect(of("logo")[0]?.image_url).toBe("https://media.licdn.com/dms/image/C4D0/company-logo_200_200/0/1630550424733/logo?e=2147483647&v=beta");
    expect(of("logo")[0]?.certainty).toBe("likely");
    expect(of("tagline").map((i) => i.value)).toEqual(["Pow! Coffee Now!", "Coffee for Everyone!"]);
    expect(of("description")).toHaveLength(1);
    expect(of("category").map((i) => i.value)).toEqual(["Coffee shop"]);
    // The fact's slot key is the row's key, so an answer on the slot is the fact's answer at Create.
    for (const f of FACTS) expect(rows.map((r) => r.key)).toContain(factSlotKey(f));
  });

  it("the agent's website merges into the typed row — one Websites row, never two", () => {
    const typed = typedWebsiteItem("dynamiteroasting.com");
    const merged = mergeEvidence(new Map(), typed ? [typed] : []);
    expect(merged.size).toBe(1);
    const after = mergeEvidence(merged, factEvidence(FACTS, null));
    expect([...after.values()].filter((i) => i.field === "website")).toHaveLength(1);
  });
});

// MKT-075 / MKT-084 (reviewer, 2026-10-15, silverliningcreamery.com and the recorded Ritual round): the facts agent's
// [confirmed] Brand Statements never reached About or Tagline, and the accounts it found (Instagram, Snapchat) never
// reached Social accounts.
describe("the facts agent's statements and accounts reach their slots", () => {
  const fact = (field: string, value: string, certainty = "confirmed"): BrandFact => ({
    key: `fact:${field}:${value.toLowerCase()}`, field, field_label: field, value, certainty, reason: "Instagram biography.",
    evidence_urls: ["https://www.instagram.com/x/"], known_field: "true",
  });

  it("a short brand statement is a tagline; a long one is About", () => {
    const rows = factEvidence([
      fact("brand_statement", "We're out to forever change the way people know coffee."),
      fact("brand_statement", "SF Coffee Roastery with cafes in the Mission, Bayview, Haight, and Hayes Valley neighborhoods of San Francisco- and the Oxbow Public Market in Napa.", "likely"),
    ], null);
    expect(rows.filter((i) => i.field === "tagline").map((i) => [i.value, i.certainty])).toEqual([["We're out to forever change the way people know coffee.", "certain"]]);
    expect(rows.filter((i) => i.field === "description").map((i) => i.certainty)).toEqual(["likely"]);
  });

  it("social_* facts are Social accounts under the server's account key, from a handle or an address", () => {
    const facts = [
      fact("social_instagram", "silverliningcreamerysd"),
      fact("social_snapchat", "https://www.snapchat.com/add/SilverLiningRC", "likely"),
      fact("linkedin_company_page", "https://www.linkedin.com/company/acme-roasters/"),
      fact("social_instagram", "https://www.instagram.com/p/DboJiddGte_/"),
    ];
    const rows = factEvidence(facts, null).filter((i) => i.field === "social");
    expect(rows.map((i) => [i.key, i.platform, i.handle, i.certainty])).toEqual([
      ["social:instagram:silverliningcreamerysd", "instagram", "silverliningcreamerysd", "certain"],
      ["social:snapchat:silverliningrc", "snapchat", "SilverLiningRC", "likely"],
      ["social:linkedin:acme-roasters", "linkedin", "acme-roasters", "certain"],
    ]);
    // A post address is never an account; every account row's key is the fact's slot key (answers reach Create).
    expect(factSlotKey(facts[3] as BrandFact)).toBeNull();
    expect(factSlotKey(facts[0] as BrandFact)).toBe("social:instagram:silverliningcreamerysd");
  });
});
