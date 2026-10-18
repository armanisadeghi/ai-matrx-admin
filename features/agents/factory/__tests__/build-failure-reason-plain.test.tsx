/** A stopped build says why right on the panel, in plain text, not behind a collapsed "Why". */
import { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("../service", () => ({
  getFactoryBuild: jest.fn(async () => ({
    id: "build-1", spineStatus: "failed", createdAt: "", startedAt: null, endedAt: null, checkpointAt: null,
    state: { outcome: "failed", error: "The contract step could not run: the daily AI spend ceiling was reached.", steps: {}, request: { spec: { name: "x", purpose: "y" }, door: "studio", mandate_key: null } },
  })),
  keepBuildAnyway: jest.fn(),
  startAgentBuild: jest.fn(),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => false }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectIsAdminPerson: () => false }));
jest.mock("@/components/mardown-display/blocks/agent-factory-kinds/AgentFactoryKindBlocks", () => ({ outcomeChip: () => null }));

import { BuildProgress } from "../components/BuildProgress";
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

it("shows the failure reason inline", async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => { createRoot(host).render(<BuildProgress buildId="build-1" />); });
  await flush(); await flush();
  expect(host.querySelector("details")).toBeNull();
  expect(host.querySelector('[data-testid="build-failure-reason"]')?.textContent).toContain("daily AI spend ceiling");
});
