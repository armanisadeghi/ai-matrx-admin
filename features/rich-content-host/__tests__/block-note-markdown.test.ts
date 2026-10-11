import { comparisonToMarkdown, decisionTreeToMarkdown } from "../block-note-markdown";

describe("structured blocks become note markdown", () => {
  it("keeps every decision path with its Yes/No branch", () => {
    const md = decisionTreeToMarkdown({
      title: "Bug triage",
      description: "",
      root: {
        id: "r",
        question: "Reproducible?",
        yes: { id: "y", action: "Fix it now" },
        no: { id: "n", action: "Collect more data" },
      },
    } as never);
    expect(md).toContain("# Bug triage");
    expect(md).toContain("- Reproducible?");
    expect(md).toContain("  - **Yes** → **Do:** Fix it now");
    expect(md).toContain("  - **No** → **Do:** Collect more data");
  });

  it("writes the comparison as a real table, escaping pipes", () => {
    const md = comparisonToMarkdown({
      title: "Databases",
      description: "",
      items: ["Postgres", "Mongo"],
      criteria: [{ name: "License", values: ["PostgreSQL", "SSPL | custom"], type: "text" }],
    } as never);
    expect(md).toContain("| Item | License |");
    expect(md).toContain("| Postgres | PostgreSQL |");
    expect(md).toContain("| Mongo | SSPL \\| custom |");
  });
});
