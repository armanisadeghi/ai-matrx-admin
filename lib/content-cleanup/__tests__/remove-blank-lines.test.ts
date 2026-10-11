import { cleanContent } from "../clean";
import { DEFAULT_ENABLED_OPERATIONS } from "../operations";

const withRemove = [...DEFAULT_ENABLED_OPERATIONS, "remove-blank-lines" as const];

describe("remove-blank-lines", () => {
  it("is off by default", () => {
    expect(DEFAULT_ENABLED_OPERATIONS).not.toContain("remove-blank-lines");
    expect(cleanContent("1\n\n2\n\n3", DEFAULT_ENABLED_OPERATIONS).cleaned).toBe(
      "1\n\n2\n\n3",
    );
  });

  it("removes every empty line without joining lines", () => {
    const report = cleanContent("1\n\n2\n\n\n\n3\n \t\n4", withRemove);
    expect(report.cleaned).toBe("1\n2\n3\n4");
  });

  it("leaves already-tight text untouched", () => {
    const report = cleanContent("1\n2\n3", withRemove);
    expect(report.changed).toBe(false);
  });

  it("keeps one blank line around protected blocks and never touches their inside", () => {
    const note = "intro\n\n\n```js\nconst a = 1;\n\n\nconst b = 2;\n```\n\n\nafter\n\nend";
    const report = cleanContent(note, withRemove);
    expect(report.cleaned).toBe(
      "intro\n\n```js\nconst a = 1;\n\n\nconst b = 2;\n```\n\nafter\nend",
    );
  });
});
