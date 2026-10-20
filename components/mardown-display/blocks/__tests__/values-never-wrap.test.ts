/**
 * A VALUE NEVER BREAKS ACROSS LINES (review 3 R8, phone 375px): "$1.2M" drew as "$1.2" over "M",
 * "50%" as "50" over "%", recipe "30 min" as "30 mi…", "Main: 1 of 2" over two lines. jsdom has no layout,
 * so this pins the class on each value; the pixel proof is the 375px walk in review3-blocks-fixes.md.
 */
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "..", rel), "utf8");
const tagWith = (src: string, marker: string) => {
  const at = src.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  return src.slice(src.lastIndexOf("<", at), src.indexOf(">", at));
};

it.each([
  ["stats/StatsBlock.tsx", 'data-stat-value=""'],
  ["cooking-recipes/cookingRecipeDisplay.tsx", 'data-recipe-stat-value=""'],
  ["progress/ProgressTrackerBlock.tsx", 'data-progress-value=""'],
])("%s draws its value on one line, never truncated", (file, marker) => {
  const tag = tagWith(read(file), marker);
  expect(tag).toContain("whitespace-nowrap");
  expect(tag).not.toMatch(/\btruncate\b/);
});

it("the tasks toolbar keeps each count whole", () => {
  const src = read("tasks/TaskChecklist.tsx");
  expect(src).toMatch(/"whitespace-nowrap text-muted-foreground"[^\n]*\n\s*Main:/);
});
