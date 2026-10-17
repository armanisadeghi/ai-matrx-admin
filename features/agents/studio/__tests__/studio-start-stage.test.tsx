/**
 * The start screen's stage: "Describe it" is open by default (the big box is the hero), the
 * in-place ways in are toggles that swap the headline and the open panel, the navigating ways in
 * are not toggles, and a recent agent opens "Improve an agent I have" on it.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, back: jest.fn() }) }));
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: (props: Record<string, unknown>) => (
    <div>
      <textarea aria-label={props["aria-label"] as string} readOnly />
      {props.leading as React.ReactNode}
    </div>
  ),
}));
jest.mock("@/features/agents/factory/service", () => ({ startAgentBuild: jest.fn() }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));
jest.mock("@ai-matrx/kit/coming-soon", () => ({ announceComingSoon: jest.fn() }));
const agents = [
  { id: "old", name: "Old one", isArchived: false, isOwner: true, accessLevel: "owner", updatedAt: "2026-01-01T00:00:00Z", createdAt: null },
  { id: "new", name: "New one", isArchived: false, isOwner: true, accessLevel: "owner", updatedAt: "2026-10-01T00:00:00Z", createdAt: null },
];
jest.mock("@ai-matrx/agents/catalog/react", () => ({
  AgentListDropdown: () => <div data-testid="picker" />,
  useAgentListCore: () => ({ agents, isLoading: false }),
}));

import { StudioStart } from "../components/StudioStart";

function mount(onStart = jest.fn()) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(<StudioStart onStart={onStart} onBack={() => undefined} />);
  });
  const q = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  return { host, q, onStart };
}

describe("StudioStart — the stage", () => {
  it("opens on Describe it: the composer is there, its toggle is pressed, the headline asks the job", () => {
    const { q } = mount();
    expect(q("studio-describe")).not.toBeNull();
    expect(q("studio-mode-describe")!.getAttribute("aria-pressed")).toBe("true");
    expect(q("studio-headline")!.textContent).toBe("What should your agent do?");
  });

  it("an in-place way in swaps the panel and the headline; a navigating one is not a toggle", () => {
    const { q } = mount();
    act(() => q("studio-mode-improve")!.click());
    expect(q("studio-describe")).toBeNull();
    expect(q("studio-improve")).not.toBeNull();
    expect(q("studio-mode-improve")!.getAttribute("aria-pressed")).toBe("true");
    expect(q("studio-mode-describe")!.getAttribute("aria-pressed")).toBe("false");
    expect(q("studio-headline")!.textContent).toBe("Which agent should get better?");
    expect(q("studio-mode-with-claude-code")!.hasAttribute("aria-pressed")).toBe(false);
    act(() => q("studio-mode-with-claude-code")!.click());
    expect(push).toHaveBeenCalledWith("/agents/new/studio/with-claude-code");
  });

  it("lists recent agents newest first; pressing one opens Improve on it", () => {
    const { host, onStart } = mount();
    const rows = [...host.querySelectorAll('[data-testid="studio-recent-agent"]')] as HTMLElement[];
    expect(rows.map((r) => r.textContent?.includes("New one") ? "new" : "old")).toEqual(["new", "old"]);
    act(() => rows[0]!.click());
    expect(onStart).toHaveBeenCalledWith({ mode: "improve", agentId: "new" });
  });
});
