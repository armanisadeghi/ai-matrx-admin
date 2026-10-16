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

describe("a city typed on the last place applies to all of them", () => {
  const near = (t: string, area = "") => parseInput(t, "local_business", area);
  it("vs list: trailing city becomes the shared Near for every item", () => {
    const out = near("Hattie B's Hot Chicken vs Prince's Hot Chicken Shack, Nashville TN");
    expect(out.sharedArea).toBe("Nashville TN");
    expect(out.items.map((i) => i.input)).toEqual([
      { label: "Hattie B's Hot Chicken", inputs: { name: "Hattie B's Hot Chicken", city: "Nashville TN", country: "US" } },
      { label: "Prince's Hot Chicken Shack", inputs: { name: "Prince's Hot Chicken Shack", city: "Nashville TN", country: "US" } },
    ]);
  });
  it("'and … in City' and comma lists share it too", () => {
    expect(near("Hattie B's and Bolton's in Nashville TN").items.map((i) => i.input.inputs?.city)).toEqual(["Nashville TN", "Nashville TN"]);
    expect(near("Hattie B's, Bolton's, Pancho's in Nashville TN").items.map((i) => i.input.inputs?.city))
      .toEqual(["Nashville TN", "Nashville TN", "Nashville TN"]);
  });
  it("cities on several items stay their own; no city means no shared area", () => {
    const own = near("Sparrow Bakery, Bend OR vs Looney Bean, Portland OR");
    expect(own.sharedArea).toBe("");
    expect(own.items.map((i) => i.input.inputs?.city)).toEqual(["Bend OR", "Portland OR"]);
    expect(near("A vs B").sharedArea).toBe("");
  });
  it("the Near box, once edited, wins over the typed city", () => {
    const out = near("A vs B, Nashville TN", "Memphis TN");
    expect(out.items.map((i) => i.input.inputs?.city)).toEqual(["Memphis TN", "Memphis TN"]);
  });
  it("companies never get a shared area", () => {
    expect(parseInput("Yeti vs Stanley, Inc", "companies_reviews").sharedArea).toBe("");
  });
});
