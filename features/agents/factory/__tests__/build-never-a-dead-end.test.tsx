/**
 * Owner 2026-10-19 (Studio build 54c4ffd1): "you can't say it's a workflow and then leave the user
 * staring at an ugly blank page". A workflow verdict is a calm choice beside a build that keeps
 * going; a build that stops shows what happened, Try again, and a way out.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

const spec = { name: "topical_prep", purpose: "Prepare the topical map inputs." };
let next: Record<string, unknown> = {};

jest.mock("../service", () => ({
  getFactoryBuild: jest.fn(async () => next),
  keepBuildAnyway: jest.fn(),
  startAgentBuild: jest.fn(async () => "build-2"),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => false }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectIsAdminPerson: () => false }));
jest.mock("@/components/mardown-display/blocks/agent-factory-kinds/AgentFactoryKindBlocks", () => ({ outcomeChip: () => null }));

import { BuildProgress } from "../components/BuildProgress";
import { startAgentBuild } from "../service";

const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

async function mount(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(<BuildProgress buildId="build-1" />);
  });
  await flush();
  await flush();
  return host;
}

function button(host: HTMLElement, label: string): HTMLElement | undefined {
  return [...host.querySelectorAll<HTMLElement>("button, a")].find((b) => b.textContent?.trim() === label);
}

it("a workflow verdict is a choice beside a build that keeps going", async () => {
  next = {
    id: "build-1", spineStatus: "running", createdAt: "", startedAt: null, endedAt: null, checkpointAt: null,
    state: {
      current_step: "goal", steps: {}, request: { spec, door: "studio", mandate_key: null },
      workflow_suggestion: { reason: "A chain of deliverables.", proposed_steps: ["Offerings", "Audiences", "Assembly"] },
    },
  };
  const host = await mount();
  const card = host.querySelector('[data-testid="workflow-suggestion"]');
  expect(card).not.toBeNull();
  expect(button(host, "Continue as one agent")).toBeDefined();
  const plan = button(host, "Plan it as a workflow") as HTMLAnchorElement | undefined;
  expect(plan?.getAttribute("href")).toBe("/agents/orchestras");
  expect(plan?.getAttribute("target")).toBe("_blank");
  expect(card?.textContent).toContain("3 suggested steps");
  expect(host.textContent).not.toContain("needs a workflow");
});

it("a stopped build offers Try again and a way out", async () => {
  next = {
    id: "build-1", spineStatus: "failed", createdAt: "", startedAt: null, endedAt: null, checkpointAt: null,
    state: { outcome: "failed", error: "The contract step could not run.", steps: {}, request: { spec, door: "studio", mandate_key: null } },
  };
  const host = await mount();
  expect(button(host, "Build unproven")).toBeDefined();
  const retry = button(host, "Try again");
  expect(retry).toBeDefined();
  await act(async () => {
    retry?.click();
  });
  expect(startAgentBuild).toHaveBeenCalledWith(expect.objectContaining({ spec, unproven: false, door: "studio" }));
});
