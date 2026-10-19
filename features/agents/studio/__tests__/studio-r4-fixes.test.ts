import { readFileSync } from "node:fs";
import { join } from "node:path";
import { studioChangeNote } from "../version-notes";
import { recentAgents, recentLines } from "../recent-agents";
import { agentLabel } from "@/features/ai-watch/everything-feed";
import { planWantsWorkflow, workflowBrief } from "../../orchestra-studio/workflow-brief";

const read = (p: string) => readFileSync(join(__dirname, p), "utf8");

describe("a Studio save writes a person-facing change note", () => {
  it("uses the applied proposal's title, else one phrase per kind of change", () => {
    expect(studioChangeNote(["messages"], "Ask for the visit date first")).toBe("Ask for the visit date first");
    expect(studioChangeNote(["messages", "modelId"])).toBe("Instructions updated, Model changed");
    expect(studioChangeNote(["_unknown"])).toBeNull();
  });
  it("both save paths go through saveWithNote", () => {
    const c = read("../components/StudioControls.tsx");
    expect(c.match(/await saveWithNote\(dispatch/g)?.length).toBe(2);
    expect(c).toContain("change_note: note");
  });
});

describe("the first test of an agent", () => {
  const page = read("../components/AgentStudioPage.tsx");
  it("says Run until a run exists, then Run again", () => {
    expect(page).toContain('hasRun ? "Run again" : "Run"');
  });
  it("fills the inputs from the first saved test case without running by itself", () => {
    expect(page).toContain("autoRun: false");
    expect(read("../components/StudioRun.tsx")).toContain("seed?.autoRun !== false");
  });
});

describe("Studio chat hides the sent chip through the chat package's host option", () => {
  it("registers hostSuppliesContext for every conversation it shows", () => {
    expect(read("../components/StudioRun.tsx")).toContain("hostSuppliesContext: true");
  });
});

describe("recent agents", () => {
  const base = { isArchived: false, isOwner: true, accessLevel: "owner", updatedAt: "2026-10-10T00:00:00Z", createdAt: "2026-10-01T00:00:00Z" };
  it("lists one row per agent id", () => {
    expect(recentAgents([{ ...base, id: "a", name: "Agency assistant" }, { ...base, id: "a", name: "Agency assistant" }])).toHaveLength(1);
  });
  it("tells two same-named agents apart", () => {
    const list = [
      { ...base, id: "a", name: "Agency assistant", createdAt: "2026-10-01T12:00:00Z" },
      { ...base, id: "b", name: "Agency assistant", createdAt: "2026-10-05T12:00:00Z" },
    ];
    const lines = recentLines(list);
    expect(lines.get("a")).not.toBe(lines.get("b"));
  });
});

describe("Watch AI filter labels", () => {
  it("drops the internal author tag", () => {
    expect(agentLabel("Scraper · Did we get the real page? (Jev)")).toBe("Scraper · Did we get the real page?");
    expect(agentLabel("Goal Writer")).toBe("Goal Writer");
  });
});

describe("Orchestra Studio offers the workflow path", () => {
  it("builds a brief from the plan and spots a workflow recommendation", () => {
    const plan = { title: "Lead intake", recommendation: "Use a workflow with two steps.", steps: [{ n: 1, title: "Read", summary: "Read the lead." }] } as never;
    expect(planWantsWorkflow(plan)).toBe(true);
    expect(workflowBrief(plan)).toContain("1. Read: Read the lead.");
    expect(read("../../orchestra-studio/OrchestraStudioPage.tsx")).toContain('data-testid="build-as-workflow"');
  });
});

describe("Meet Matrx's buttons never cover content", () => {
  it("sit in a footer under the scroll area, not sticky over it", () => {
    const w = read("../../../onboarding/meet-matrx/MeetMatrxWindow.tsx");
    expect(w).toContain("meet-window-footer");
    expect(w).not.toContain("sticky bottom-0");
  });
});
