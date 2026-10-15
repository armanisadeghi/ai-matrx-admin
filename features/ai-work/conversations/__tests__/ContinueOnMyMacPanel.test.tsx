/**
 * FORCING TESTS for "Continue on my Mac": the person's Matrx 2 computer is asked first through the
 * SHIPPED door (`matrx2Coding.ts`); only the browser's wiring is mocked. A chat that computer cannot
 * continue says why, and is never passed over to Matrx Local. Sentences are typed by hand.
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ContinueOnMyMacPanel } from "../components/ContinueOnMyMacPanel";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: jest.fn(async () => true) }));
jest.mock("@/features/ai-work/lib/matrx2Computers", () => ({
  browserCodingDoors: {
    reach: { listComputers: jest.fn(), withClient: jest.fn(), findConversation: jest.fn() },
    local: { capability: jest.fn(), start: jest.fn(), resumable: jest.fn(), reconcile: jest.fn() },
  },
}));

const doors = (
  jest.requireMock("@/features/ai-work/lib/matrx2Computers") as {
    browserCodingDoors: { reach: { listComputers: jest.Mock; withClient: jest.Mock }; local: { resumable: jest.Mock } };
  }
).browserCodingDoors;

let container: HTMLDivElement | null = null;
let root: Root | null = null;
async function render(): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container as HTMLDivElement);
    root.render(<ContinueOnMyMacPanel providerSessionId="c-old" conversationId="conv-1" />);
  });
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  jest.clearAllMocks();
});

function computerAnswers(sessions: unknown[], chats: unknown[]): void {
  doors.reach.listComputers.mockResolvedValue([{ deviceId: "d1", name: "Studio Mac", online: true, protocolVersion: "1.40" }]);
  doors.reach.withClient.mockImplementation(async (_c: unknown, work: (client: unknown) => unknown) =>
    work({
      request: async (op: string) => (op === "coding.sessions.list" ? { sessions, runs: {}, recent: [], title_status: { state: "ready" } } : { chats }),
      stream: () => ({}),
      on: () => () => undefined,
      getState: () => ({ status: "ready", welcome: { protocol_version: "1.40" }, lastError: null }),
      subscribe: () => () => undefined,
    }),
  );
}

describe("Continue on my Mac asks Matrx 2 first", () => {
  // RED WHEN: a chat outside the computer's newest chats reads "not found", or falls through to Matrx Local.
  it("names the window and the computer, and never asks Matrx Local", async () => {
    computerAnswers([], []);
    await render();
    expect(container?.textContent).toContain("Runs on Studio Mac (Matrx 2).");
    expect(container?.textContent).toContain("This chat is not among the newest 200 chats on Studio Mac.");
    expect(doors.local.resumable).not.toHaveBeenCalled();
  });

  // RED WHEN: an unanswered computer and an unanswered Matrx Local render nothing.
  it("with no computer answering, shows both reasons", async () => {
    doors.reach.listComputers.mockResolvedValue([{ deviceId: "d1", name: "Studio Mac", online: false, protocolVersion: "1.40" }]);
    doors.local.resumable.mockRejectedValue(new Error("Matrx Local did not answer."));
    await render();
    expect(container?.textContent).toContain("Studio Mac: offline or asleep. Matrx Local did not answer.");
  });
});
