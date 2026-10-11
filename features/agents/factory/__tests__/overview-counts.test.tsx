/**
 * The doors table cannot read as "this place uses the factory" when only our own tests did, and an
 * old-builder window that predates the door stamp says so instead of showing a bare zero.
 */
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}), supabase: {} }));

import { outcomeLabel } from "@/components/mardown-display/blocks/agent-factory-kinds/AgentFactoryKindBlocks";
import { usableLabel } from "@/features/admin/users/useAdminUserLabel";
import { DOORS, FACTORY_DOOR_STAMP_SINCE, factoryDoorCounts, oldCountsForDoor } from "../overview";
import type { FactoryBuildRow } from "../types";

const now = new Date().toISOString();
function build(over: Partial<FactoryBuildRow>): FactoryBuildRow {
  return {
    id: "b", spineStatus: "completed", createdAt: now, startedAt: null, endedAt: null, mandateKey: null, name: null,
    currentStep: null, outcome: "passed", sendBacks: 0, verdict: null, agentId: "a", error: null, door: "generate",
    engine: "pipeline", userId: "tester", cost: null, ...over,
  };
}

describe("factory counts per door", () => {
  it("keeps our test accounts apart from real people", () => {
    const counts = factoryDoorCounts(
      [build({ userId: "tester" }), build({ userId: "tester" }), build({ userId: "cora" })],
      new Set(["tester"]),
    );
    expect(counts.generate.people.d30).toBe(1);
    expect(counts.generate.test.d30).toBe(2);
  });
});

describe("old-builder counts per door", () => {
  const runs = {
    byMandate: { "mandates.holder_draft": { d7: 2, d30: 5, last: now } },
    byDoor: { people_mcp: { d7: 1, d30: 1, last: now } },
  };
  it("a server door counts its stamped runs and says since when", () => {
    const door = DOORS.find((d) => d.key === "people_mcp")!;
    expect(oldCountsForDoor(door, runs)).toEqual({ counts: { d7: 1, d30: 1, last: now }, recordedSince: FACTORY_DOOR_STAMP_SINCE });
  });
  it("a browser door reads its own mandate's complete record", () => {
    const door = DOORS.find((d) => d.key === "mandate_holder_draft")!;
    expect(oldCountsForDoor(door, runs)).toEqual({ counts: { d7: 2, d30: 5, last: now }, recordedSince: null });
  });
});

describe("words for people", () => {
  it("every outcome code reads as words, mapped or not", () => {
    expect(outcomeLabel("schema_refresh_regressed")).toBe("Refresh made it worse");
    expect(outcomeLabel("some_new_outcome")).toBe("Some new outcome");
  });
  it("the profile placeholder 'User' is never a name", () => {
    expect(usableLabel("User", "admin@admin.com")).toBe("admin@admin.com");
    expect(usableLabel("Arman Sadeghi", "a@b.c")).toBe("Arman Sadeghi");
  });
});
