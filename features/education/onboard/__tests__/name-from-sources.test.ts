// A multi-source artifact (deck, quiz, summary) is titled by THE kit namer,
// from an equal share of every Source — never "<first source> and more".

const runAgentExtraction = jest.fn();
jest.mock("@/features/education/convert/runAgentExtraction", () => ({
  runAgentExtraction: (...args: unknown[]) => runAgentExtraction(...args),
}));

import { nameFromSources } from "../kitTitle";

const ctx = { dispatch: jest.fn() as never, store: {} as never, orgId: "org" };
const a = { label: "Cells.pdf", text: "A".repeat(3000) };
const b = { label: "Genetics.pdf", text: "B".repeat(3000) };

describe("nameFromSources", () => {
  beforeEach(() => runAgentExtraction.mockReset());

  it("keeps the floor for one Source and never calls the namer", async () => {
    await expect(nameFromSources([a], ctx, "Cells")).resolves.toBe("Cells");
    expect(runAgentExtraction).not.toHaveBeenCalled();
  });

  it("names several Sources from a share of EACH, with every name passed", async () => {
    runAgentExtraction.mockResolvedValue({ value: { title: "Cell Biology and Heredity" } });
    await expect(nameFromSources([a, b], ctx, "Cells")).resolves.toBe("Cell Biology and Heredity");
    const vars = runAgentExtraction.mock.calls[0][2].variables;
    expect(vars.title).toBe("Cells.pdf; Genetics.pdf");
    expect(vars.source_content).toContain("A");
    expect(vars.source_content).toContain("B");
  });

  it("falls back to the floor, never 'and more', when the namer fails", async () => {
    runAgentExtraction.mockRejectedValue(new Error("down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const title = await nameFromSources([a, b], ctx, "Cells");
    expect(title).toBe("Cells");
    expect(title).not.toMatch(/and more/i);
  });
});

describe("no generator titles a multi-source artifact '<first> and more'", () => {
  it("the quiz generator routes through nameFromSources", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    const src = fs.readFileSync("features/education/assessment/data/useAssessmentGeneration.tsx", "utf8");
    expect(src).not.toMatch(/\}\s+and more`/);
    expect(src).toContain("nameFromSources(");
  });
});
