import { parseWorkflowOverview } from "../overview-model";

const base = { definition_id: "d", spec: { nodes: [] }, node_map: {} };

describe("overview layout stamp", () => {
  it("carries the server's verified and issues through", () => {
    const o = parseWorkflowOverview({ ...base, verified: false, issues: 3 });
    expect(o?.verified).toBe(false);
    expect(o?.issues).toBe(3);
  });
  it("is null when the server did not check (chip stays honest)", () => {
    const o = parseWorkflowOverview(base);
    expect(o?.verified).toBeNull();
    expect(o?.issues).toBeNull();
  });
});
