/**
 * A title typed right after load (before the form hydrated) survives: the form merges what the person
 * typed into its state instead of resetting to the empty default; it never overwrites a value.
 */
import { mergeTyped } from "../typedBeforeHydration";

describe("keystrokes before hydration", () => {
  it("keeps the typed title and description over empty defaults", () => {
    const form = { title: "", description: "", prompt: "from the link" };
    expect(mergeTyped(form, { title: "Nightly tidy", description: "" })).toEqual({ title: "Nightly tidy", description: "", prompt: "from the link" });
  });
  it("never overwrites a value the form already holds", () => {
    expect(mergeTyped({ title: "Edited" }, { title: "stale DOM" })).toEqual({ title: "Edited" });
  });
});
