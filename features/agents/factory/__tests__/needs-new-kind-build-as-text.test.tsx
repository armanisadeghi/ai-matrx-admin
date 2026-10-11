/**
 * A build that stops on "needs a new output shape" is never a dead end for the person: it offers
 * "Build it as text", which starts the same request again (same door) with a text answer format —
 * the factory's own R46 escape (`requested_output_form` → text skips the new-kind stop).
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

const startAgentBuild = jest.fn(async () => "build-2");
jest.mock("../service", () => ({
  getFactoryBuild: jest.fn(async () => ({
    id: "build-1",
    spineStatus: "failed",
    createdAt: "",
    startedAt: null,
    endedAt: null,
    checkpointAt: null,
    state: {
      outcome: "needs_new_kind",
      error: "The contract proposes a new output kind",
      steps: {},
      request: { spec: { name: "listing_copy", purpose: "Write listing descriptions" }, door: "studio", mandate_key: null },
    },
  })),
  keepBuildAnyway: jest.fn(),
  startAgentBuild: (...args: unknown[]) => startAgentBuild(...(args as [])),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => false }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectIsAdminPerson: () => false }));
jest.mock("@/components/mardown-display/blocks/agent-factory-kinds/AgentFactoryKindBlocks", () => ({
  outcomeChip: () => null,
}));

import { BuildProgress, TEXT_ANSWER_FORMAT } from "../components/BuildProgress";

const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

describe("BuildProgress — needs a new output shape", () => {
  it("offers Build it as text, restarting the same request as text on the same door", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const rebuilt: string[] = [];
    act(() => {
      createRoot(host).render(<BuildProgress buildId="build-1" onRebuilt={(id) => rebuilt.push(id)} />);
    });
    await flush();
    await flush();
    const button = [...host.querySelectorAll("button")].find((b) => b.textContent === "Build it as text");
    expect(button).toBeDefined();
    await act(async () => button!.click());
    await flush();
    expect(startAgentBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        spec: { name: "listing_copy", purpose: "Write listing descriptions", response_format: TEXT_ANSWER_FORMAT },
        door: "studio",
        unproven: false,
      }),
    );
    expect(rebuilt).toEqual(["build-2"]);
  });
});
