import {
  INTEL_SOURCES,
  candidateUrls,
  inputUrlFor,
  intelFacts,
  normalizePastedUrl,
  storedIntel,
  withIntel,
} from "../company-intelligence";

const byKey = (k: string) => INTEL_SOURCES.find((s) => s.key === k)!;

describe("company intelligence mapping", () => {
  it("reads a LinkedIn company record into labelled facts", () => {
    const facts = intelFacts("linkedin_company", {
      employees_in_linkedin: 16665,
      company_size: "5,001-10,000 employees",
      followers: 1761770,
      industries: "Technology, Information and Internet",
      founded: 2010,
      website: "https://stripe.com/",
      funding: { last_round_type: "Series I", last_round_raised: { value: 6500000000, currency: "USD" } },
    });
    const map = Object.fromEntries(facts.map((f) => [f.label, f.value]));
    expect(map.Employees).toBe("16,665 on LinkedIn");
    expect(map.Followers).toBe("1,761,770");
    expect(map.Founded).toBe("2010");
    expect(map["Last funding round"]).toBe("Series I · $6.5B");
  });

  it("reads Crunchbase funding, Glassdoor rating and a Maps place", () => {
    const cb = intelFacts("crunchbase_company", {
      financials_highlights: { total_funding_amount: { value: 8700000000, currency: "USD" }, num_funding_rounds: 14 },
      industries: [{ name: "FinTech" }, { name: "Payments" }],
    });
    expect(cb.find((f) => f.label === "Total funding")?.value).toBe("$8.7B");
    expect(cb.find((f) => f.label === "Industry")?.value).toBe("FinTech, Payments");
    const gd = intelFacts("glassdoor_company", { ratings_overall: 4.2, review_count: "1,204", details_size: "5001 to 10000 Employees" });
    expect(gd.find((f) => f.label === "Rating")?.value).toBe("4.2 / 5");
    expect(gd.find((f) => f.label === "Reviews")?.value).toBe("1,204");
    const maps = intelFacts("google_maps_place", {
      rating: 4.6,
      reviews_count: 1203,
      address: "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
      open_hours: { monday: "9 AM-5 PM" },
    });
    expect(maps.find((f) => f.label === "Address")?.value).toContain("Mountain View");
    expect(maps.find((f) => f.label === "Hours")?.value).toMatch(/\d/);
  });

  it("returns nothing for an empty or unknown record (the card says so, never a blank success)", () => {
    expect(intelFacts("linkedin_company", {})).toEqual([]);
    expect(intelFacts("linkedin_company", null)).toEqual([]);
    expect(intelFacts("nope", { name: "x" })).toEqual([]);
  });

  it("finds each source's input among the party's own addresses", () => {
    const urls = candidateUrls({ values: ["https://www.linkedin.com/company/stripe/", "stripe.com", null, "https://stripe.com"] });
    expect(urls).toEqual(["https://www.linkedin.com/company/stripe/", "https://stripe.com"]);
    expect(inputUrlFor(byKey("linkedin_company"), urls)).toBe("https://www.linkedin.com/company/stripe/");
    expect(inputUrlFor(byKey("crunchbase_company"), urls)).toBeNull();
  });

  it("accepts only an address its source can read, and a bare Maps place id", () => {
    expect(normalizePastedUrl(byKey("linkedin_company"), "linkedin.com/company/stripe/")).toBe("https://linkedin.com/company/stripe/");
    expect(normalizePastedUrl(byKey("linkedin_company"), "https://www.linkedin.com/in/someone")).toBeNull();
    expect(normalizePastedUrl(byKey("google_maps_place"), "ChIJj61dQgK6j4AR4GeTYWZsKWw")).toBe(
      "https://www.google.com/maps/place/?q=place_id:ChIJj61dQgK6j4AR4GeTYWZsKWw",
    );
    expect(normalizePastedUrl(byKey("glassdoor_company"), "https://www.glassdoor.com/Overview/Working-at-Stripe-EI_IE671932.11,17.htm")).not.toBeNull();
  });

  it("stores one source without losing other attributes or other sources, and reads it back", () => {
    const intel = { fetched_at: "2026-10-11T00:00:00Z", source_url: "u", job_id: "j", table_id: "t", facts: [{ label: "A", value: "1" }] };
    const first = withIntel({ journalist: { x: 1 } }, "linkedin_company", intel);
    const second = withIntel(first, "glassdoor_company", { ...intel, source_url: "g" });
    expect((second as { journalist: unknown }).journalist).toEqual({ x: 1 });
    const back = storedIntel(second);
    expect(Object.keys(back).sort()).toEqual(["glassdoor_company", "linkedin_company"]);
    expect(back.linkedin_company?.facts).toEqual([{ label: "A", value: "1" }]);
    expect(storedIntel(null)).toEqual({});
    expect(storedIntel({ company_intelligence: { x: { facts: "bad" } } })).toEqual({});
  });
});
