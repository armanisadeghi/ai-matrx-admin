import { dockRunKind } from "../DockRunCard";

describe("dock run card picks the kind from the run's chat-stamp label", () => {
  it("a workflow run draws as a workflow with its own name", () => {
    expect(dockRunKind("Workflow Dock proof")).toEqual({ hint: "workflow", name: "Dock proof" });
    expect(dockRunKind("Workflow run")).toEqual({ hint: "workflow", name: null });
  });
  it("records runs keep their own kinds", () => {
    expect(dockRunKind("Notion import of Players").hint).toBe("import");
    expect(dockRunKind("Copy Players").hint).toBe("copy");
  });
  it("the recorded stamp tool decides, not the label's wording", () => {
    expect(dockRunKind("Research on Lakes", "research_run")).toEqual({ hint: "workflow", name: "Research on Lakes" });
    expect(dockRunKind("Notion import of Players", "records").hint).toBeNull();
    expect(dockRunKind("Workflow Copy machine", "workflow_run").hint).toBe("workflow");
  });
});
