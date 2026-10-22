// An EMPTY design board opens with the AI building it: the design-system job starts in the SIDE CHAT with NO
// message (the agent talks first), once per board per tab, with no click (Arman 2026-10-22, VISION Part 31).
import { act } from "react";
import { createRoot } from "react-dom/client";

const startShellChatJob = jest.fn(() => true);
jest.mock("@ai-matrx/chat/canvas/workspace/shell-chat-page-context", () => ({
  startShellChatJob: (...a: unknown[]) => (startShellChatJob as (...x: unknown[]) => boolean)(...a),
}));
jest.mock("@ai-matrx/agents/mandates", () => ({ MANDATE_KEYS: { design_system__build: "design_system.build" } }));
const toastError = jest.fn();
const toastSuccess = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) } }));

import { startDesignBuild, stashBoardStart, takeBoardStart, useBoardStartRun } from "../templates/board-start";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function open(boardId: string, isDesign: boolean, isEmpty: boolean) {
  function Probe() {
    useBoardStartRun(boardId, isDesign, isEmpty);
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  return () => act(() => root.unmount());
}

beforeEach(() => {
  startShellChatJob.mockClear().mockReturnValue(true);
  toastError.mockClear();
  toastSuccess.mockClear();
  window.sessionStorage.clear();
});

it("a kept start is read once, then gone", () => {
  stashBoardStart("b1", { mode: "ai" });
  expect(takeBoardStart("b1")).toEqual({ mode: "ai" });
  expect(takeBoardStart("b1")).toBeNull();
});

it("the build starts with no message: the agent speaks first", () => {
  expect(startDesignBuild()).toBe(true);
  expect(startShellChatJob).toHaveBeenCalledWith("design_system.build", { run: true });
});

it("an empty design board starts the AI on its own, once per board per tab", () => {
  const close = open("b-empty", true, true);
  expect(startShellChatJob).toHaveBeenCalledTimes(1);
  expect(startShellChatJob).toHaveBeenCalledWith("design_system.build", { run: true });
  close();
  open("b-empty", true, true);
  expect(startShellChatJob).toHaveBeenCalledTimes(1);
});

it("a design board with content, or any other board, starts nothing", () => {
  open("b-full", true, false);
  open("b-plain", false, true);
  expect(startShellChatJob).not.toHaveBeenCalled();
});

it("a board started from a style says so and starts no build", () => {
  stashBoardStart("b-style", { mode: "style", styleName: "Calm" });
  open("b-style", true, true);
  expect(toastSuccess).toHaveBeenCalledWith("Calm style added");
  expect(startShellChatJob).not.toHaveBeenCalled();
});

it("says so when no chat can open beside the page, and tries again next open", () => {
  startShellChatJob.mockReturnValue(false);
  const close = open("b-nochat", true, true);
  expect(toastError).toHaveBeenCalledTimes(1);
  close();
  startShellChatJob.mockReturnValue(true);
  open("b-nochat", true, true);
  expect(startShellChatJob).toHaveBeenCalledTimes(2);
});
