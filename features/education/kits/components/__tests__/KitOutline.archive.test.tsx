import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { KitOutlineCard } from "../KitOutline";
import type { KitOutlineState } from "../../outline/useKitOutline";

jest.mock("@/features/overlays/openers/workflowRunWindow", () => ({
  useOpenWorkflowRunWindow: () => jest.fn(),
}));

const outline: KitOutlineState = {
  sections: [
    {
      id: "live",
      position: 0,
      title: "Live chapter",
      summary: "Shown in the working outline.",
      body: "",
      facts: [],
      chunkIds: [],
    },
  ],
  archivedSections: [
    {
      id: "archived",
      position: 1,
      title: "Archived chapter",
      summary: "Retired from generation.",
      body: "",
      facts: [],
      chunkIds: [],
    },
  ],
  readError: null,
  stale: false,
  coverage: null,
  activeRunId: null,
  progress: null,
  stalled: false,
  runError: null,
  starting: false,
  build: async () => undefined,
  reload: jest.fn(),
};

describe("KitOutlineCard archived sections", () => {
  it("hides archived sections until the shared disclosure opens, then marks them Archived", async () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    await act(async () => {
      root.render(<KitOutlineCard outline={outline} onMoved={jest.fn()} />);
    });

    expect(host.textContent).toContain("Live chapter");
    expect(host.textContent).toContain("Archived sections (1)");
    expect(host.textContent).not.toContain("Archived chapter");

    const toggle = [...host.querySelectorAll("button")].find((button) => button.textContent?.includes("Archived sections"));
    expect(toggle).toBeTruthy();
    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.textContent).toContain("Archived chapter");
    expect(host.textContent).toContain("Archived");
    expect(host.textContent).not.toContain("Make more");
    expect(host.textContent).not.toContain("Go deeper");

    await act(async () => root.unmount());
  });
});
