import { humanizeStructuralMessage as h } from "@/features/content-ir/input/humanize-structural-error";

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
