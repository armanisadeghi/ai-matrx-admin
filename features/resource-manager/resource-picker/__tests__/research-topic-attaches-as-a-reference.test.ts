/**
 * A research topic picked in the resource picker becomes a live
 * `research_topic` record reference, and "Research" is a door in the one
 * attach-menu list (the composer opens it with `initialView="research"`).
 */
import { parseReferenceFence } from "@ai-matrx/agents/envelope";
import { researchTopicResource } from "../resource-adapters";
import { flattenResourcePickerItems } from "../resource-picker-menu-items";

describe("research topic attachment", () => {
  it("builds a research_topic reference carrying the topic id and name", () => {
    const topic = { id: "6c1d1d0a-8f1e-4c55-9a43-1b2f0c3d4e5f", name: "Solar panel recycling" };
    const resource = researchTopicResource(topic);
    expect(resource.type).toBe("research_topic");
    expect(resource.data).toMatchObject(topic);
    const parsed = parseReferenceFence(resource.data.referenceFence);
    expect(parsed?.directive.noun).toBe("research_topic");
    expect(JSON.stringify(parsed)).toContain(topic.id);
  });

  it("offers Research in the attach menu", () => {
    const research = flattenResourcePickerItems().find((item) => item.id === "research");
    expect(research?.label).toBe("Research");
  });
});
