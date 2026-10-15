import { EMOJI_GROUPS, SPECIAL_GROUPS, searchSymbols } from "../doc-symbols";

describe("emoji and special characters", () => {
  it("every entry is a glyph with a name", () => {
    for (const g of [...EMOJI_GROUPS, ...SPECIAL_GROUPS]) for (const it of g.items) {
      expect(it.char.length).toBeGreaterThan(0);
      expect(it.name.length).toBeGreaterThan(0);
    }
  });
  it("finds by name and by the glyph itself", () => {
    expect(searchSymbols(EMOJI_GROUPS, "rocket").map((x) => x.char)).toContain("🚀");
    expect(searchSymbols(EMOJI_GROUPS, "🚀")[0]?.name).toBe("rocket");
    expect(searchSymbols(SPECIAL_GROUPS, "euro").map((x) => x.char)).toEqual(["€"]);
    expect(searchSymbols(SPECIAL_GROUPS, "arrow").length).toBeGreaterThan(8);
    expect(searchSymbols(SPECIAL_GROUPS, "zzzz-none")).toEqual([]);
  });
  it("no duplicates inside one search", () => {
    const r = searchSymbols(EMOJI_GROUPS, "o");
    expect(new Set(r.map((x) => x.char)).size).toBe(r.length);
  });
});
