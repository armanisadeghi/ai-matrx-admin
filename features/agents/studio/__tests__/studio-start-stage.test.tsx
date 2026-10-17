/**
 * The start screen's stage: "Describe it" is open by default (the big box is the hero), the in-place
 * ways in are toggles that swap the headline and the open panel (closed panels stay mounted, so typed
 * text survives a switch), the navigating ways in are not toggles, a recent agent opens "Improve an
 * agent" on it, and a person with no agents gets starter jobs and a friendly Improve with a way out.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, back: jest.fn(), prefetch: jest.fn() }) }));
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: (props: Record<string, unknown>) => (
    <div>
      <textarea
        aria-label={props["aria-label"] as string}
        value={props.value as string}
        onChange={props.onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
      />
      {props.leading as React.ReactNode}
      {props.onSubmit ? <button data-testid={`submit-${props["aria-label"] as string}`}>{props.submitText as string}</button> : null}
    </div>
  ),
}));
jest.mock("@/features/agents/factory/service", () => ({ startAgentBuild: jest.fn() }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));
// The Import menu renders its items inline here, so a press is a plain click.
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect, ...rest }: { children: React.ReactNode; onSelect: () => void }) => (
    <div role="menuitem" onClick={onSelect} {...rest}>
      {children}
    </div>
  ),
}));
jest.mock("@ai-matrx/kit/coming-soon", () => ({ announceComingSoon: jest.fn() }));
const twoAgents = [
  { id: "old", name: "Old one", isArchived: false, isOwner: true, accessLevel: "owner", updatedAt: "2026-01-01T00:00:00Z", createdAt: null },
  { id: "new", name: "New one", isArchived: false, isOwner: true, accessLevel: "owner", updatedAt: "2026-10-01T00:00:00Z", createdAt: null },
];
let mockAgents: typeof twoAgents = twoAgents;
jest.mock("@ai-matrx/agents/catalog/react", () => ({
  AgentListDropdown: () => <div data-testid="picker" />,
  useAgentListCore: () => ({ agents: mockAgents, isLoading: false }),
}));

import { StudioStart } from "../components/StudioStart";
import { STUDIO_STARTERS } from "../modes";

function mount(onStart = jest.fn()) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(<StudioStart onStart={onStart} onBack={() => undefined} />);
  });
  const q = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  return { host, q, onStart };
}

function type(box: HTMLTextAreaElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setter.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  mockAgents = twoAgents;
  sessionStorage.clear();
  push.mockClear();
});

describe("StudioStart — the stage", () => {
  it("opens on Describe it: the composer is shown, its toggle is pressed, the headline asks the job, the button says Build", () => {
    const { q } = mount();
    expect(q("studio-describe")!.hidden).toBe(false);
    expect(q("studio-mode-describe")!.getAttribute("aria-pressed")).toBe("true");
    expect(q("studio-headline")!.textContent).toBe("What should your agent do?");
    expect(q("submit-What should the agent do?")!.textContent).toBe("Build agent");
  });

  it("the ways in read as plain verbs", () => {
    const { host } = mount();
    const labels = [...host.querySelectorAll('[data-testid="studio-modes"] button')].map((b) => b.textContent);
    expect(labels).toEqual(["Describe it", "Do it together", "Improve an agent", "From my examples", "Import"]);
  });

  it("an in-place way in swaps the panel and the headline; a navigating one is not a toggle", () => {
    const { q } = mount();
    act(() => q("studio-mode-improve")!.click());
    expect(q("studio-describe")!.hidden).toBe(true);
    expect(q("studio-improve")!.hidden).toBe(false);
    expect(q("studio-mode-improve")!.getAttribute("aria-pressed")).toBe("true");
    expect(q("studio-mode-describe")!.getAttribute("aria-pressed")).toBe("false");
    expect(q("studio-headline")!.textContent).toBe("Which agent should get better?");
    expect(q("studio-mode-do-with-me")!.hasAttribute("aria-pressed")).toBe(false);
    expect(q("studio-mode-import")!.hasAttribute("aria-pressed")).toBe(false);
  });

  it("the Import menu holds the two bring-over ways in, each opening its own page", () => {
    const { q } = mount();
    act(() => q("studio-mode-with-claude-code")!.click());
    expect(push).toHaveBeenCalledWith("/agents/new/studio/with-claude-code");
    expect(q("studio-mode-from-claude-account")!.textContent).toContain("Import from Claude");
  });

  it("typed text survives switching ways in and is kept for the session", () => {
    const { host, q } = mount();
    const box = () => host.querySelector('[data-testid="studio-describe"] textarea') as HTMLTextAreaElement;
    type(box(), "Draft replies to tenant emails");
    act(() => q("studio-mode-from-examples")!.click());
    act(() => q("studio-mode-describe")!.click());
    expect(box().value).toBe("Draft replies to tenant emails");
    expect(sessionStorage.getItem("agent-studio:start:describe")).toBe("Draft replies to tenant emails");
    const again = mount();
    const box2 = again.host.querySelector('[data-testid="studio-describe"] textarea') as HTMLTextAreaElement;
    expect(box2.value).toBe("Draft replies to tenant emails");
  });

  it("lists recent agents newest first under Keep working on; pressing one opens Improve on it", () => {
    const { host, q, onStart } = mount();
    expect(q("studio-recent")!.textContent).toContain("Keep working on");
    const rows = [...host.querySelectorAll('[data-testid="studio-recent-agent"]')] as HTMLElement[];
    expect(rows.map((r) => (r.textContent?.includes("New one") ? "new" : "old"))).toEqual(["new", "old"]);
    act(() => rows[0]!.click());
    expect(onStart).toHaveBeenCalledWith({ mode: "improve", agentId: "new" });
  });
});

describe("StudioStart — a person with no agents yet", () => {
  it("shows starter jobs instead of Recent; pressing one fills the box", () => {
    mockAgents = [];
    const { host, q } = mount();
    expect(q("studio-recent")).toBeNull();
    const starters = [...host.querySelectorAll('[data-testid="studio-starter"]')] as HTMLElement[];
    expect(starters).toHaveLength(STUDIO_STARTERS.length);
    act(() => starters[1]!.click());
    expect((host.querySelector('[data-testid="studio-describe"] textarea') as HTMLTextAreaElement).value).toBe(STUDIO_STARTERS[1]);
  });

  it("Improve says there is nothing yet and offers Describe it as the way out", () => {
    mockAgents = [];
    const { q } = mount();
    act(() => q("studio-mode-improve")!.click());
    expect(q("picker")).toBeNull();
    expect(q("studio-improve-empty")!.textContent).toContain("You have no agents yet.");
    act(() => q("studio-improve-describe")!.click());
    expect(q("studio-describe")!.hidden).toBe(false);
  });
});
