import { kindOfLink, parseInput, splitNameAndPlace } from "../parse-input";

describe("the one box reads whatever a person types", () => {
  it("splits names on vs, new lines, commas and 'and'", () => {
    expect(parseInput("Hydro Flask vs Yeti vs. Stanley", "companies_reviews").items.map((i) => i.text))
      .toEqual(["Hydro Flask", "Yeti", "Stanley"]);
    expect(parseInput("Hydro Flask\nYeti\n\nStanley", "companies_reviews").items).toHaveLength(3);
    expect(parseInput("hydroflask.com, yeti.com", "companies_reviews").items.map((i) => i.input.label))
      .toEqual(["hydroflask.com", "yeti.com"]);
    expect(parseInput("Hydro Flask and Yeti", "companies_reviews").items).toHaveLength(2);
  });

  it("a link is kept exactly and decides the kind", () => {
    const p = parseInput("https://www.trustpilot.com/review/www.hydroflask.com\nhttps://www.trustpilot.com/review/yeti.com", "local_business");
    expect(p.suggestedKind).toBe("companies_reviews");
    expect(p.items[0].input.url).toBe("https://www.trustpilot.com/review/www.hydroflask.com");
    expect(kindOfLink("https://www.google.com/maps/place/Sparrow+Bakery/@44,-121")).toBe("local_business");
    expect(kindOfLink("https://www.amazon.com/dp/B0")).toBe("products");
    expect(kindOfLink("https://www.instagram.com/x")).toBe("social_accounts");
    expect(kindOfLink("https://hydroflask.com")).toBeNull();
  });

  it("places carry their own city, or the shared one", () => {
    const p = parseInput("Sparrow Bakery, Bend OR vs Looney Bean in Bend, OR vs Nancy P's", "local_business", "Bend, OR");
    expect(p.items.map((i) => i.input.inputs)).toEqual([
      { name: "Sparrow Bakery", city: "Bend OR", country: "US" },
      { name: "Looney Bean", city: "Bend, OR", country: "US" },
      { name: "Nancy P's", city: "Bend, OR", country: "US" },
    ]);
    // one line "Name, City" is ONE place, not two
    expect(parseInput("Sparrow Bakery, Bend OR", "local_business").items).toHaveLength(1);
    expect(splitNameAndPlace("Blue Star Donuts near Portland")).toEqual({ name: "Blue Star Donuts", city: "Portland" });
  });

  it("duplicates collapse and nothing empty becomes an item", () => {
    expect(parseInput("Yeti vs yeti vs  vs Stanley", "companies_reviews").items.map((i) => i.text)).toEqual(["Yeti", "Stanley"]);
    expect(parseInput("   ", "companies_reviews").items).toHaveLength(0);
  });
});
