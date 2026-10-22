// The start a person chose in the gallery rides to the opened board in this tab only and runs ONCE; Build with AI
// starts the design-system job in the SIDE CHAT with the person's words as typed (never a window).
const startShellChatJob = jest.fn(() => true);
jest.mock("@ai-matrx/chat/canvas/workspace/shell-chat-page-context", () => ({
  startShellChatJob: (...a: unknown[]) => (startShellChatJob as (...x: unknown[]) => boolean)(...a),
}));
jest.mock("@ai-matrx/agents/mandates", () => ({ MANDATE_KEYS: { design_system__build: "design_system.build" } }));
const toastError = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: (...a: unknown[]) => toastError(...a) } }));

import { startDesignBuild, stashBoardStart, takeBoardStart } from "../templates/board-start";

beforeEach(() => {
  startShellChatJob.mockClear().mockReturnValue(true);
  toastError.mockClear();
});

it("is read once, then gone", () => {
  stashBoardStart("b1", { mode: "ai", brief: "A bakery" });
  expect(takeBoardStart("b1")).toEqual({ mode: "ai", brief: "A bakery" });
  expect(takeBoardStart("b1")).toBeNull();
  expect(takeBoardStart("other")).toBeNull();
});

it("Build with AI starts the job in the side chat with the words exactly as typed", () => {
  startDesignBuild("  A bakery in Austin.\nWarm and friendly. ");
  expect(startShellChatJob).toHaveBeenCalledWith("design_system.build", { send: "  A bakery in Austin.\nWarm and friendly. " });
  startDesignBuild(null);
  expect(startShellChatJob).toHaveBeenLastCalledWith("design_system.build", undefined);
  expect(toastError).not.toHaveBeenCalled();
});

it("says so when no chat can open beside the page", () => {
  startShellChatJob.mockReturnValue(false);
  startDesignBuild("A bakery");
  expect(toastError).toHaveBeenCalledTimes(1);
});
