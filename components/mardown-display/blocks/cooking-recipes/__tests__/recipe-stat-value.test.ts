/** Review 4, F7: a recipe time says its label once ("Prep 10 minutes", never "Prep / 10 minutes prep"). */
import { recipeStatValue } from "../cookingRecipeDisplay";

const PREP = ["prep", "preparation", "prep time"];
const COOK = ["cook", "cooking", "cook time", "cooking time"];

describe("recipeStatValue", () => {
  it.each([
    ["10 minutes prep", PREP, "10 minutes"],
    ["20 minutes cooking", COOK, "20 minutes"],
    ["Prep time: 15 min", PREP, "15 min"],
    ["45 minutes", COOK, "45 minutes"],
    ["1 hour cook time", COOK, "1 hour"],
    ["", PREP, ""],
    [undefined, PREP, ""],
  ])("%p → %p", (raw, words, expected) => {
    expect(recipeStatValue(raw as string | undefined, words)).toBe(expected);
  });
});
