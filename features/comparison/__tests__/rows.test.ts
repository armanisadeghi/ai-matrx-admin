import { applyNear, editRow, foundMatches, needsSearch, newRow, pickCandidate, rowsFromText, withResolve } from "../rows";
import type { LookupMatch } from "../contract";

const match = (name: string): LookupMatch => ({
  item: { label: name, url: `https://www.google.com/maps/place/data=!4m2!3m1!1s0x1:0x${name.length}` },
  name, detail: "910 Montreal Cir, St Paul, MN", logo_url: null, website: null, url: null, rating: 4.7, reviews_count: 379,
});

describe("the guaranteed rows", () => {
  it("the shared Near fills empty cities and never replaces a typed one", () => {
    const rows = [newRow({ name: "A" }), newRow({ name: "B", city: "Bend, OR" })];
    const near = applyNear(rows, "Sherman Oaks, CA");
    expect(near.map((r) => r.city)).toEqual(["Sherman Oaks, CA", "Bend, OR"]);
    expect(applyNear(near, "Encino, CA").map((r) => r.city)).toEqual(["Encino, CA", "Bend, OR"]);
  });

  it("editing a matched row drops its old answer, so it is searched again", () => {
    const found = withResolve(newRow({ name: "Summit" }), {
      status: "found", query: "Summit", match: match("Summit Brewing Company"), category: "Brewery", candidates: [], message: null, points: 300,
    });
    expect(foundMatches([found])).toHaveLength(1);
    expect(needsSearch(found)).toBe(false);
    const edited = editRow(found, { city: "St. Paul, MN" });
    expect(edited.state).toBe("idle");
    expect(needsSearch(edited)).toBe(true);
    expect(foundMatches([edited])).toHaveLength(0);
  });

  it("a row with no exact match keeps its nearest real places, and a pick makes it matched", () => {
    const choose = withResolve(newRow({ name: "Sumit Bruing" }), {
      status: "choose", query: "Sumit Bruing", match: null, category: "", message: "No exact match. Is it one of these?", points: 300,
      candidates: [{ match: match("Summit Brewing Company"), category: "Brewery" }],
    });
    expect(choose.state).toBe("choose");
    expect(needsSearch(choose)).toBe(false); // never searched again silently; the person picks
    const picked = pickCandidate(choose, choose.candidates[0]);
    expect(foundMatches([picked]).map((m) => m.name)).toEqual(["Summit Brewing Company"]);
    expect(picked.category).toBe("Brewery");
  });

  it("one typed line fills rows the person then confirms", () => {
    const rows = rowsFromText("Sparrow Bakery, Bend OR vs Looney Bean in Bend, OR", "local_business", "");
    expect(rows.map((r) => [r.name, r.city, r.state])).toEqual([
      ["Sparrow Bakery", "Bend OR", "idle"], ["Looney Bean", "Bend, OR", "idle"]]);
    expect(rowsFromText("Hydro Flask vs Yeti", "companies_reviews", "").map((r) => r.name)).toEqual(["Hydro Flask", "Yeti"]);
  });
});
