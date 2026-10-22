import { buildSourceFeature } from "../build-run-service";

// The server's registered source features (aidream source_attribution.SOURCE_FEATURES) that a
// build run may carry. The door is never sent as the source feature: `studio` reached live as
// one and every Studio build was refused with 422 invalid_source_feature (live-walk-2, 2026-10-22).
const REGISTERED = new Set(["agent-studio", "agent-factory"]);
const DOORS = [
  "agent_author", "agent_service", "custom_action", "from_chat", "mandate_holder_draft", "generate",
  "plan_room", "node_agent", "content_foundry", "people_mcp", "masterwork", "agent_author_rebuild", "studio",
];

describe("a build run's source feature", () => {
  it("is a registered feature for every door, never the door itself", () => {
    for (const door of [...DOORS, null, undefined]) {
      expect(REGISTERED.has(buildSourceFeature(door))).toBe(true);
    }
  });
  it("names the Studio for a Studio build", () => {
    expect(buildSourceFeature("studio")).toBe("agent-studio");
  });
});
