/** @jest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VoiceTransferHistory } from "./VoiceTransferHistory";

const conversationId = "44444444-4444-4444-8444-444444444444";

jest.mock("@/utils/supabase/adminLane", () => ({
  browserAdminLaneOpen: () => true,
}));

jest.mock("@/features/scopes/registry/entityRegistry", () => ({
  tryGetEntityInfo: () => ({
    hrefFor: (id: string) => `/chat/${id}`,
    titleColumn: null,
  }),
}));

jest.mock("@/features/organizations/peek/kinds-list", () => ({
  hasPeek: () => false,
}));

jest.mock("./transfer-context-service", () => ({
  loadTransferContexts: async () => [
    {
      callId: "11111111-1111-4111-8111-111111111111",
      eventId: 1,
      observedAt: "2026-10-15T16:00:00Z",
      conversationId,
    },
  ],
}));

jest.mock("@/components/official/InfoHint", () => ({
  InfoHint: () => null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("VoiceTransferHistory", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("opens a correlated conversation through its canonical admin twin", async () => {
    await act(async () => root.render(<VoiceTransferHistory />));

    expect(host.querySelector("a")?.getAttribute("href")).toBe(
      `/administration/chat/cx-dashboard/conversations/${conversationId}`,
    );
  });
});
