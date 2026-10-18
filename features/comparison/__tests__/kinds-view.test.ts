import { parseKind, parseQuote, parseResult } from "../contract";
import { barFraction, fieldGroups, isNumeric, whyLine } from "../verdict";
import { facetChoice, setFacetChoice, withFacets } from "../facet-choice";

const V = (value: unknown, display: string, is_best = false, basis = "on the page") => ({ value, display, is_best, basis });

const products = parseResult({
  kind: "products", kind_label: "Products", primary_field: "rating",
  fields: [
    { key: "rating", label: "Rating", type: "rating", direction: "higher_better", is_primary: true },
    { key: "price", label: "Price", type: "money", direction: "lower_better" },
    { key: "li", label: "LinkedIn followers", type: "int", direction: "higher_better", facet: "linkedin", facet_label: "LinkedIn" },
  ],
  hidden_fields: [{ key: "spec_connectivity", label: "Connectivity", reason: "constant" }],
  items: [
    { item_id: "a", name: "Alpha", rank: 1, source_label: "Amazon", values: { rating: V(4.6, "4.6", true), price: V(189.99, "$189.99") },
      facets: [{ key: "linkedin", label: "LinkedIn", status: "failed", error: "We could not find a LinkedIn page for Alpha.", points: 100, seconds: 3 }] },
    { item_id: "w", name: "Walmart pick", rank: 2, source_label: "Walmart", values: { rating: V(4.4, "4.4"), price: V(179, "$179.00", true) } },
  ],
})!;

test("a price is numeric and the cheapest gets the full bar", () => {
  const price = products.fields.find((f) => f.key === "price")!;
  expect(isNumeric(price)).toBe(true);
  expect(barFraction(price, 179, products)).toBe(1);
  expect(barFraction(price, 189.99, products)).toBeCloseTo(179 / 189.99);
  expect(whyLine(price, products)).toBe("Walmart pick costs least · $179.00 to $189.99 for Alpha");
});

test("fields group under their facet, the kind's own first", () => {
  const groups = fieldGroups(products.fields);
  expect(groups.map((g) => [g.key, g.label, g.fields.length])).toEqual([["", "", 2], ["linkedin", "LinkedIn", 1]]);
});

test("the wire's facets, hidden fields and store labels are read, older runs read as empty", () => {
  expect(products.items[0].source_label).toBe("Amazon");
  expect(products.items[0].facets?.[0].status).toBe("failed");
  expect(products.hidden_fields?.[0]).toEqual({ key: "spec_connectivity", label: "Connectivity", reason: "constant" });
  const old = parseResult({ kind: "local_business", items: [{ item_id: "x", name: "X", values: {} }] })!;
  expect(old.hidden_fields).toEqual([]);
  expect(old.items[0].facets).toEqual([]);
  const kind = parseKind({ key: "companies_reviews", facets: [{ key: "google", label: "Google rating", default_on: true, speed: "fast", typical_seconds: 5, points_per_item: 50, adds: ["Google rating", "Google reviews"] }] });
  expect(kind.facets?.[0]).toMatchObject({ key: "google", default_on: true, points_per_item: 50 });
  const q = parseQuote({ total_points: 700, facets: [{ key: "google", label: "Google rating", on: false, points: 100 }] });
  expect(q.facets?.[0]).toMatchObject({ key: "google", on: false, points: 100 });
});

test("the facet choice rides every quote and run of that kind only", () => {
  expect(withFacets({ kind: "companies_reviews", items: [] })).not.toHaveProperty("facets");
  setFacetChoice("companies_reviews", ["google"]);
  expect(facetChoice("companies_reviews")).toEqual(["google"]);
  expect(withFacets({ kind: "companies_reviews", items: [] })).toMatchObject({ facets: ["google"] });
  expect(withFacets({ kind: "products", items: [] })).not.toHaveProperty("facets");
  setFacetChoice("companies_reviews", null);
  expect(withFacets({ kind: "companies_reviews", items: [] })).not.toHaveProperty("facets");
});
