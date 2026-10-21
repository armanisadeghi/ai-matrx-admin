// The start a person chose in the gallery rides to the opened board in this tab only and runs ONCE.
jest.mock("@ai-matrx/chat/host/window-openers", () => ({ useOpenAgentRunWindow: () => jest.fn() }));
jest.mock("@ai-matrx/chat/mandates/service", () => ({ fetchMandateIdentities: jest.fn() }));
jest.mock("@ai-matrx/agents/mandates", () => ({ MANDATE_KEYS: { design_system__build: "design_system.build" } }));
jest.mock("@/features/surfaces/manifests/board.manifest", () => ({ BOARD_SURFACE_NAME: "board" }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { stashBoardStart, takeBoardStart } from "../templates/open-design-build";

it("is read once, then gone", () => {
  stashBoardStart("b1", { mode: "ai", brief: "A bakery" });
  expect(takeBoardStart("b1")).toEqual({ mode: "ai", brief: "A bakery" });
  expect(takeBoardStart("b1")).toBeNull();
  expect(takeBoardStart("other")).toBeNull();
});
