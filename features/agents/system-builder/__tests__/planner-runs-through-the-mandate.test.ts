import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";

const PLANNER_SOURCE = readFileSync(join(__dirname, "..", "planner.ts"), "utf8");
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("the System Builder planner is a Mandate, not an agent id", () => {
  it("names no agent id in code (the Holder lives in the mandate's seed)", () => {
    expect(PLANNER_SOURCE).not.toMatch(UUID);
    expect(PLANNER_SOURCE).not.toMatch(/agentId\s*:/);
  });

  it("launches by the mandate key, and the generated key set declares it", () => {
    expect(PLANNER_SOURCE).toMatch(/mandateKey\s*:\s*PLANNER_MANDATE_KEY/);
    expect(MANDATE_KEYS.agent_factory__system_plan).toBe("agent_factory.system_plan");
  });
});
