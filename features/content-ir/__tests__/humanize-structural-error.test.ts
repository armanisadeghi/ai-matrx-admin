import { unclaimedStructuralMessages, humanizeStructuralMessage as h } from "@/features/content-ir/input/humanize-structural-error";

describe("humanizeStructuralMessage", () => {
  it("never shows ajv paths", () => {
    expect(h("/facts/0 must have required property 'field'")).toBe("facts, item 1: field is required");
    expect(h("(root) must have required property 'notes'")).toBe("notes is required");
    expect(h("/title must be string")).toBe("title: must be text");
    expect(h("/a/2/b must be number")).toBe("a, item 3, b: must be a number");
  });
  it("passes unknown wording through without a path", () => {
    expect(h("/x must match pattern")).toBe("x: must match pattern");
  });
});

describe("unclaimedStructuralMessages (the form's under-field list)", () => {
  const detail =
    "sample failed schema: /facts/0 must have required property 'field'; (root) must have required property 'name'";
  const none = { byField: {}, formLevel: [] };

  it("splits the joined validator string — never shows it whole", () => {
    const out = unclaimedStructuralMessages(detail, none, true);
    expect(out).toEqual([
      "/facts/0 must have required property 'field'",
      "(root) must have required property 'name'",
    ]);
    expect(out.map((m) => h(m))).toEqual([
      "facts, item 1: field is required",
      "name is required",
    ]);
  });

  it("stays empty when every message is shown under its field", () => {
    const claimed = { byField: { facts: ["/facts/0 must have required property 'field'"] }, formLevel: [] };
    expect(unclaimedStructuralMessages(detail, claimed, true)).toEqual([]);
    // Fields hidden (JSON view): everything lands under the editor.
    expect(unclaimedStructuralMessages(detail, claimed, false)).toHaveLength(2);
  });
});
