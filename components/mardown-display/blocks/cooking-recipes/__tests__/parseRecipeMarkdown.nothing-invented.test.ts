/** Review 5, G5: a recipe block shows only what the recipe says. No guessed servings, times or title. */
import { parseRecipeMarkdown } from "../parseRecipeMarkdown";

const BASE = "#### Ingredients\n- 2 eggs\n#### Instructions\n1. Mix for 3 minutes\n";

describe("parseRecipeMarkdown never invents a fact", () => {
  it("reads Prep and Cook lines and leaves servings and total empty", () => {
    const r = parseRecipeMarkdown(`<cooking_recipe>\n### Pancakes\nPrep: 10 minutes prep\nCook: 20 minutes cooking\n${BASE}</cooking_recipe>`)!;
    expect(r.prepTime).toBe("10 minutes prep");
    expect(r.cookTime).toBe("20 minutes cooking");
    expect(r.yields).toBe("");
    expect(r.totalTime).toBe("");
  });

  it("a recipe with no metadata has no servings or times", () => {
    const r = parseRecipeMarkdown(`### Toast\n${BASE}`)!;
    expect([r.yields, r.totalTime, r.prepTime, r.cookTime]).toEqual(["", "", "", ""]);
    const none = parseRecipeMarkdown(BASE)!;
    expect(none.title).toBe("");
  });

  it("keeps the bold Yields and Time lines, and a total never spawns a prep or cook time", () => {
    const r = parseRecipeMarkdown(`### Cake\n**Yields:** 8 slices\n**Time:** 45 minutes\n${BASE}`)!;
    expect(r.yields).toBe("8 slices");
    expect(r.totalTime).toBe("45 minutes");
    expect(r.prepTime).toBe("");
    expect(r.cookTime).toBe("");
  });

  it("takes prep and cook from the parenthesised form", () => {
    const r = parseRecipeMarkdown(`### Cake\n**Time:** 45 minutes (15 minutes prep, 30 minutes baking)\n${BASE}`)!;
    expect([r.totalTime, r.prepTime, r.cookTime]).toEqual(["45 minutes", "15 minutes prep", "30 minutes baking"]);
  });
});
