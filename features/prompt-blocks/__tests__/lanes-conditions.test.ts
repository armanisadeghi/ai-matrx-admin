import { describeCondition, conditionToJson, isEmptyCondition, parseCondition } from "../conditions";
import { SYSTEM_ORG_ID, laneOf, matchesQuery, mayBeStale, partitionByLane } from "../lanes";

describe("lanes", () => {
  const me = "u1";
  const rows = [
    { organization_id: SYSTEM_ORG_ID, visibility: "internal", created_by: "x" },
    { organization_id: "o1", visibility: "internal", created_by: "u1" },
    { organization_id: "o1", visibility: "personal", created_by: "u1" },
    { organization_id: "o1", visibility: "personal", created_by: "someone-else" },
  ] as never[];
  it("puts system, my personal and org rows in their own lane", () => {
    const lanes = partitionByLane(rows, me);
    expect(lanes.system).toHaveLength(1);
    expect(lanes.mine).toHaveLength(1);
    expect(lanes.organization).toHaveLength(2);
    expect(laneOf(rows[1], me)).toBe("organization");
  });
  it("search matches name, label and description", () => {
    expect(matchesQuery({ name: "research_rules", label: "Research", description: null }, "RULES")).toBe(true);
    expect(matchesQuery({ name: "a", label: "b", description: "tone of voice" }, "voice")).toBe(true);
    expect(matchesQuery({ name: "a", label: "b", description: null }, "zzz")).toBe(false);
  });
  it("stale only when the tool changed after the block", () => {
    expect(mayBeStale("2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z")).toBe(true);
    expect(mayBeStale("2026-10-06T00:00:00Z", "2026-10-05T00:00:00Z")).toBe(false);
    expect(mayBeStale("2026-10-06T00:00:00Z", null)).toBe(false);
  });
});

describe("conditions", () => {
  it("empty never matches and says so", () => {
    expect(isEmptyCondition(parseCondition({}))).toBe(true);
    expect(describeCondition({})).toMatch(/Never/);
  });
  it("round-trips only the keys that carry something", () => {
    const c = parseCondition({ provider: ["Anthropic"], model: [], latest: true, reasoning: ["high", "max"], junk: 1 });
    expect(conditionToJson(c)).toEqual({ provider: ["Anthropic"], latest: true, reasoning: ["high", "max"] });
    expect(describeCondition(c)).toBe("Anthropic + latest model + reasoning high or max");
  });
});
