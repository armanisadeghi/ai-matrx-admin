import { aiTableCountLabel } from "../useAiTableBulk";

describe("AI-model table bulk wording comes from the table's noun, never string-glued", () => {
  it("uses the declared plural for irregular nouns", () => {
    expect(aiTableCountLabel(3, "alias", "aliases")).toBe("3 aliases");
    expect(aiTableCountLabel(1, "alias", "aliases")).toBe("1 alias");
  });
  it("falls back to noun + s only when no plural is declared", () => {
    expect(aiTableCountLabel(2, "model")).toBe("2 models");
    expect(aiTableCountLabel(2, "API")).toBe("2 APIs");
  });
});
