import { hasChosenColumns, openingHiddenFields } from "../openingColumns";

const f = (name: string) => ({ key: name, label: name, name });
const many = (names: string[]) => names.map(f);

describe("openingHiddenFields", () => {
  const outputs = ["url", "title", "rating", "address", "phone", "website", "category", "reviews_count", "price", "hours", "is_listing_claimed_by_current_signed_in_user"];
  const table = many([...outputs, "is_current_signed_in_agent_responsible", "extra_a"]);

  it("keeps the first 8 telling fields (identity link last) and hides every other column", () => {
    const hidden = openingHiddenFields(table, outputs, 8)!;
    const shown = table.map((x) => x.key).filter((k) => !hidden.includes(k));
    expect(shown).toEqual(["title", "rating", "address", "phone", "website", "category", "reviews_count", "price"]);
    expect(hidden).toHaveLength(table.length - 8);
    expect(hidden).toContain("is_current_signed_in_agent_responsible");
  });

  it("matches by label words as well as key", () => {
    const t = many(["Title", "Rating", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8"]);
    const hidden = openingHiddenFields(t, ["title", "rating"], 8)!;
    expect(hidden).not.toContain("Title");
    expect(hidden).toHaveLength(8);
  });

  it("does nothing when the table already fits, or the fields are not recognised", () => {
    expect(openingHiddenFields(many(["a", "b", "c"]), ["a", "b"], 8)).toBeNull();
    expect(openingHiddenFields(table, ["unknown_one"], 8)).toBeNull();
  });
});

describe("identity columns", () => {
  it("treats place_id and *_url as plumbing: they are the last to show", () => {
    const outs = ["place_id", "listing_url", "name", "category", "address", "phone", "rating", "reviews_count", "price", "hours"];
    const hidden = openingHiddenFields(many(outs), outs, 8)!;
    expect(hidden.sort()).toEqual(["listing_url", "place_id"]);
  });
});

describe("hasChosenColumns", () => {
  it("is false with nothing chosen and true for an address, a view or a look", () => {
    expect(hasChosenColumns(null, [], {})).toBe(false);
    expect(hasChosenColumns({ hidden: ["a"] }, [], {})).toBe(true);
    expect(hasChosenColumns(null, [{ presentation: { hiddenFields: ["a"] } }], {})).toBe(true);
    expect(hasChosenColumns(null, [{ presentation: {} }], { v: { presentation: { hiddenFields: ["a"] } } })).toBe(true);
  });
});
