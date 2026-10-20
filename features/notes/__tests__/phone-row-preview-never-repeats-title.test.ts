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
