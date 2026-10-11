/**
 * A recipe's ingredients become a real shopping list: one section, one task per ingredient
 * ("2 cups flour"), handed to the platform's own task import (ImportTasksModal). Ingredients the
 * person already ticked in the recipe are left out of the list — they have them.
 */
import type { TaskItemType } from "@/components/mardown-display/blocks/tasks/TaskChecklist";
import type { Ingredient } from "./parseRecipeMarkdown";

export function recipeShoppingList(
  title: string,
  ingredients: Ingredient[],
  haveIndexes: ReadonlySet<number> = new Set(),
): TaskItemType[] {
  const children: TaskItemType[] = [];
  ingredients.forEach((ingredient, index) => {
    if (haveIndexes.has(index)) return;
    const line = [ingredient.amount, ingredient.item].map((part) => (part ?? "").trim()).filter(Boolean).join(" ");
    if (!line) return;
    children.push({ id: `ingredient-${index}`, title: line, type: "task", checked: false, children: [] });
  });
  if (children.length === 0) return [];
  return [{ id: "shopping-list", title: `Shopping list: ${title}`.trim(), type: "section", children }];
}
