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
const mockDispatch = jest.fn();
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => false, useAppDispatch: () => mockDispatch }));
jest.mock("../build-run-service", () => ({ readBuildRun: async () => null, answerBuildGate: jest.fn() }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectIsAdminPerson: () => false }));
jest.mock("@/components/mardown-display/blocks/agent-factory-kinds/AgentFactoryKindBlocks", () => ({ outcomeChip: () => null }));

import { BuildProgress } from "../components/BuildProgress";
import { startAgentBuild } from "../service";
import { KEPT_OUTCOMES, type FactoryOutcome } from "../types";

const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

async function mount(onEditDescription?: (d: string) => void): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(<BuildProgress buildId="build-1" onEditDescription={onEditDescription} />);
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
  expect(button(host, "Build anyway")).toBeDefined();
  const retry = button(host, "Try again");
  expect(retry).toBeDefined();
  await act(async () => {
    retry?.click();
  });
  expect(startAgentBuild).toHaveBeenCalledWith(expect.objectContaining({ spec, unproven: false, door: "studio" }));
});

/**
 * Review 2026-10-20: needs_new_kind (beaaf034), send-backs used up (65a6e39d) and too few cases
 * (b761efc8) stopped with no Try again. A Record over the whole outcome union: a new outcome fails
 * to type-check here until its row says what it shows.
 */
const EVERY_OUTCOME: Record<FactoryOutcome, { agentId?: string; extra?: string }[]> = {
  passed: [{ agentId: "agent-1" }],
  saved_unproven: [{ agentId: "agent-1" }],
  failed: [{ extra: "Build anyway" }],
  workflow_sized: [{ extra: "Build anyway" }],
  send_backs_exhausted: [{ agentId: "agent-1", extra: "Keep it anyway" }, { extra: "Build anyway" }],
  judge_not_blind: [{ agentId: "agent-1", extra: "Keep it anyway" }, { extra: "Build anyway" }],
  no_proof_inputs: [{ extra: "Build anyway" }],
  needs_new_kind: [{ extra: "Build it as text" }],
  unproven: [{ agentId: "agent-1", extra: "Keep it anyway" }, { extra: "Build anyway" }],
  worker_lost: [{ extra: "Build anyway" }],
};
const CASES = (Object.entries(EVERY_OUTCOME) as [FactoryOutcome, { agentId?: string; extra?: string }[]][]).flatMap(
  ([outcome, rows]) => rows.map((row) => [outcome, row.agentId ?? null, row.extra ?? null] as const),
);

it.each(CASES)("outcome %s (agent %s): never a dead end", async (outcome, agentId, extra) => {
  next = {
    id: "build-1", spineStatus: "completed", createdAt: "", startedAt: null, endedAt: null, checkpointAt: null,
    state: { outcome, agent_id: agentId, steps: {}, request: { spec, door: "studio", mandate_key: null } },
  };
  const edit = jest.fn();
  const host = await mount(edit);
  if (KEPT_OUTCOMES.has(outcome)) {
    expect(button(host, "Open agent")).toBeDefined();
    expect(button(host, "Try again")).toBeUndefined();
    return;
  }
  expect(button(host, "Try again")).toBeDefined();
  if (extra) expect(button(host, extra)).toBeDefined();
  const editButton = button(host, "Edit description");
  expect(editButton).toBeDefined();
  await act(async () => {
    editButton?.click();
  });
  expect(edit).toHaveBeenCalledWith(spec.purpose);
});

/** Review 2026-10-20 (build 3a3aea1d): Proof and Judge never ran on an unproven build and the screen never said why. */
it("an unproven build says why Proof and Judge do not run", async () => {
  next = {
    id: "build-1", spineStatus: "running", createdAt: "", startedAt: null, endedAt: null, checkpointAt: null,
    state: { current_step: "instructions", steps: {}, request: { spec, door: "studio", mandate_key: null, unproven: true } },
  };
  const host = await mount();
  expect(host.querySelector('[data-testid="proof-skipped"]')?.textContent).toBe(
    "No examples to prove it on. Its first 3 runs are judged.",
  );
  next = { ...next, state: { ...(next.state as object), request: { spec, door: "studio", mandate_key: null } } };
  const proven = await mount();
  expect(proven.querySelector('[data-testid="proof-skipped"]')).toBeNull();
});
