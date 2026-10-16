import { foldKeptDuplicates, keptDuplicateOf, type KeptOnBrand } from "../discovery-duplicates";

const kept: KeptOnBrand = {
  competitors: [{ name: "Wick & Ember", domain: "wickandember.com" }, { name: "Northern Lights Candle Co" }],
  people: [{ name: "Dana Reyes" }],
  offerings: [{ name: "Soy Candles" }],
};
const row = (guessed_kind: string, value: string, category = "fact", url: string | null = null) => ({
  category,
  guessed_kind,
  url,
  value: { text: value },
});

describe("keptDuplicateOf", () => {
  it("matches a competitor by name, punctuation aside", () => {
    expect(keptDuplicateOf(row("competitor", "WICK & EMBER"), kept)?.kind).toBe("competitor");
    expect(keptDuplicateOf(row("competitor", "northern lights candle co."), kept)?.kind).toBe("competitor");
  });
  it("matches a competitor by domain, www and path aside", () => {
    expect(keptDuplicateOf(row("competitor", "https://www.wickandember.com/shop"), kept)?.kind).toBe("competitor");
    expect(keptDuplicateOf(row("competitor", "Other Name", "fact", "wickandember.com"), kept)?.kind).toBe("competitor");
  });
  it("leaves a new competitor, and unrelated kinds, alone", () => {
    expect(keptDuplicateOf(row("competitor", "Brand New Rival"), kept)).toBeNull();
    expect(keptDuplicateOf(row("phone", "Wick & Ember"), kept)).toBeNull();
  });
  it("matches a linked person and a listed offering", () => {
    expect(keptDuplicateOf(row("person", "Dana Reyes"), kept)?.kind).toBe("person");
    expect(keptDuplicateOf(row("product", "soy candles", "offering"), kept)?.kind).toBe("offering");
    expect(keptDuplicateOf(row("person", "Someone Else"), kept)).toBeNull();
  });
});

describe("foldKeptDuplicates", () => {
  it("drops duplicates from the open list", () => {
    const rows = [row("competitor", "Wick & Ember"), row("competitor", "New Rival"), row("person", "Dana Reyes")];
    const { open, folded } = foldKeptDuplicates(rows, kept);
    expect(open.map((r) => r.value.text)).toEqual(["New Rival"]);
    expect(folded).toHaveLength(2);
  });
});
