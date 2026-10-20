/**
 * A PHONE ROW'S PREVIEW NEVER REPEATS ITS TITLE (review 2026-10-19 #24).
 * Every row read "RVW controls probe / RVW controls probe": the preview was the body's first line.
 */
import { notePreviewText } from "../format";

it("skips the title line and shows what follows", () => {
  expect(notePreviewText("RVW controls probe", "# RVW controls probe\n\nThe chart below.\n\n```chart\n{}\n```")).toBe("The chart below.");
  expect(notePreviewText("Groceries", "Groceries\n- milk\n- **eggs**")).toBe("milk eggs");
});
it("is empty when the body is only its title, and keeps a body whose first line is not the title", () => {
  expect(notePreviewText("Solo", "# Solo\n")).toBe("");
  expect(notePreviewText("Named by hand", "First line\nSecond")).toBe("First line Second");
});

// Review 2 (2026-10-19) #24: the title is the first line cut short — still the title line.
it("skips a first line the title was cut from", () => {
  expect(notePreviewText("Line 1: the quick brown fox...", "Line 1: the quick brown fox jumps over the dog\nLine 2: more")).toBe("Line 2: more");
  expect(notePreviewText("Line 1: the quick brown fox…", "Line 1: the quick brown fox jumps…\nNext")).toBe("Next");
  // A different first line that merely shares a short start is kept.
  expect(notePreviewText("Plan...", "Planets are round\nx")).toBe("Planets are round x");
});
