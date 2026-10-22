import { applyMapping, sampleValues, suggestMapping } from "../agentMapping";
import type { LabSample } from "../types";

const sample = {
  id: "subject:S1:archify", source: "subject", title: "Platform", subject: "S1", type: "architecture",
  spec: { diagram_type: "architecture" }, receipt: null, diagnostics: [{ code: "x" }], measurements: { schemaVersion: 1 },
  verified: false, issues: 1, screenshotFileIds: [], mermaid: { source: "graph TD", fileId: null }, rounds: [], documents: [],
  nodeMap: null, organizationId: null, createdAt: null, notes: [],
} as LabSample;

describe("send to agent mapping", () => {
  const values = sampleValues(sample);
  it("offers only the values the sample has", () => {
    expect(values.map((v) => v.key)).toEqual(["spec", "diagnostics", "measurements", "mermaid", "title", "diagram_type"]);
  });
  it("matches declared variables by name and lists what no variable takes", () => {
    const mapping = suggestMapping(["spec", "numbers", "notes"], values);
    expect(mapping).toEqual({ spec: "spec", numbers: "measurements", notes: "" });
    const applied = applyMapping(mapping, values);
    expect(Object.keys(applied.variables)).toEqual(["spec", "numbers"]);
    expect(applied.unmapped.map((v) => v.key)).toEqual(["diagnostics", "mermaid", "title", "diagram_type"]);
  });
  it("an agent with no declared variables leaves every value unmapped", () => {
    const applied = applyMapping(suggestMapping([], values), values);
    expect(applied.variables).toEqual({});
    expect(applied.unmapped).toHaveLength(values.length);
  });
});
