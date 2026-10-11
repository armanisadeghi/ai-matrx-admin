import { recipeShoppingList } from "../recipe-shopping-list";

const ingredients = [
  { amount: "2 cups", item: "flour" },
  { amount: "", item: "salt to taste" },
  { amount: "1 tsp", item: "yeast" },
];

describe("a recipe's ingredients become a real shopping list", () => {
  it("makes one task per ingredient under one section named for the recipe", () => {
    const [section] = recipeShoppingList("Sourdough", ingredients);
    expect(section.type).toBe("section");
    expect(section.title).toBe("Shopping list: Sourdough");
    expect(section.children?.map((t) => t.title)).toEqual(["2 cups flour", "salt to taste", "1 tsp yeast"]);
    expect(section.children?.every((t) => t.type === "task" && t.checked === false)).toBe(true);
  });

  it("leaves out what the person already has (ticked in the recipe)", () => {
    const [section] = recipeShoppingList("Sourdough", ingredients, new Set([0, 1]));
    expect(section.children?.map((t) => t.title)).toEqual(["1 tsp yeast"]);
  });

  it("returns nothing, not an empty section, when there is nothing to buy", () => {
    expect(recipeShoppingList("Sourdough", ingredients, new Set([0, 1, 2]))).toEqual([]);
    expect(recipeShoppingList("Sourdough", [])).toEqual([]);
  });
});
