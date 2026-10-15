import {
  keyFollowsLabel,
  resolveVariableNameEdit,
} from "../variable-name-edit";

// The live case: agent 0237fc41… carries key `vocabulary` labelled "Store vocabulary".
const diverged = { key: "vocabulary", label: "Store vocabulary", existingNames: ["vocabulary"] };

describe("variable name edits", () => {
  it("a key not derived from its label does not follow it", () => {
    expect(keyFollowsLabel("vocabulary", "Store vocabulary")).toBe(false);
    expect(keyFollowsLabel("normal_text", "Normal Text")).toBe(true);
    expect(keyFollowsLabel("city", undefined)).toBe(true);
  });

  it("an untouched blur never renames a diverged key", () => {
    expect(resolveVariableNameEdit({ ...diverged, typed: "Store vocabulary" })).toEqual({ kind: "none" });
  });

  it("editing a diverged label changes the label only", () => {
    expect(resolveVariableNameEdit({ ...diverged, typed: "Store word lists" })).toEqual({
      kind: "label",
      label: "Store word lists",
    });
  });

  it("typing the key's own name re-links label and key", () => {
    expect(resolveVariableNameEdit({ ...diverged, typed: "Vocabulary" })).toEqual({
      kind: "label",
      label: undefined,
    });
  });

  it("a linked key still follows the label", () => {
    expect(
      resolveVariableNameEdit({ key: "city", label: undefined, existingNames: ["city"], typed: "Home City" }),
    ).toEqual({ kind: "rename", name: "home_city", label: undefined });
  });

  it("a linked rename onto a taken key keeps the draft", () => {
    expect(
      resolveVariableNameEdit({ key: "city", label: undefined, existingNames: ["city", "today"], typed: "Today" }),
    ).toEqual({ kind: "duplicate" });
  });

  it("an empty field resets", () => {
    expect(resolveVariableNameEdit({ ...diverged, typed: "  " })).toEqual({ kind: "reset" });
  });
});
