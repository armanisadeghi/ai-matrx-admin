import { boxLabel, parseWorkflowOverview, stepsBehind, studioHref } from "../overview-model";
import { describeWorkflowSteps } from "../../components/run/node-presentation";

const answer = {
  definition_id: "d1",
  spec: { nodes: [{ id: "ai", label: "8 AI steps" }] },
  node_map: { ai: ["n2", "n3"], out: ["n4"] },
};

describe("workflow overview model", () => {
  it("reads the endpoint answer and refuses a body with no spec", () => {
    expect(parseWorkflowOverview(answer)?.nodeMap.ai).toEqual(["n2", "n3"]);
    expect(parseWorkflowOverview({ node_map: {} })).toBeNull();
    expect(parseWorkflowOverview(null)).toBeNull();
  });

  it("maps a picked box to the real steps behind it, in page order", () => {
    const steps = describeWorkflowSteps({
      nodes: [
        { id: "n1", data: { label: "Ask" } },
        { id: "n3", data: { label: "Write" } },
        { id: "n2", data: { label: "Research" } },
      ],
      edges: [],
    });
    const overview = parseWorkflowOverview(answer)!;
    expect(stepsBehind(overview, "ai", steps).map((s) => s.nodeId)).toEqual(["n3", "n2"]);
    expect(stepsBehind(overview, null, steps)).toEqual([]);
    expect(stepsBehind(overview, "gone", steps)).toEqual([]);
  });

  it("names a box by its label, else its id", () => {
    expect(boxLabel(answer.spec, "ai")).toBe("8 AI steps");
    expect(boxLabel(answer.spec, "x")).toBe("x");
  });

  it("opens Studio on the workflow with the first picked step selected", () => {
    expect(studioHref("https://workflows.aimatrx.com/", "d1", ["n2", "n3"])).toBe(
      "https://workflows.aimatrx.com/workflows/d1?select=n2",
    );
    expect(studioHref("https://w.test", "d1", [])).toBe("https://w.test/workflows/d1");
  });
});
