/**
 * FORCING TEST (lane K2, 2026-10-21) — a row this screen just decided must SAY SO in its open window.
 *
 * Seen live (CLOSE proof, approval c35e731d): Approve succeeded ("Approved 1 proposal."), and the open window kept
 * "Waiting for you — nothing applies until you decide" with its Approve and Decline buttons. The window must show
 * the decided state at once: the word, no question, no buttons.
 */

import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@/components/navigation/AppLink", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

// eslint-disable-next-line import/first -- after the mocks above
import { ApprovalRowDetail } from "../ApprovalQueue";
import type { ApprovalItem } from "../types";

const item: ApprovalItem = {
  key: "store_change:c35e731d",
  kindId: "store_change",
  headline: "Copy 71 pages into Clients B",
  acceptEffect: "Allows this one job.",
  rejectEffect: "Nothing is copied.",
  mode: "mode_4",
};

function draw(decided?: "accept" | "reject" | "decided") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <ApprovalRowDetail
        item={item}
        kindLabel="Table change"
        decided={decided}
        decide={decided ? <button>Approve</button> : <button>Approve</button>}
      />,
    );
  });
  return { text: host.textContent ?? "", host, unmount: () => act(() => root.unmount()) };
}

it("a waiting row still asks", () => {
  const waiting = draw();
  expect(waiting.text).toContain("Waiting for you");
  expect(waiting.host.querySelector("button")).not.toBeNull();
  waiting.unmount();
});

it("a row this screen approved says Approved and no longer asks", () => {
  const done = draw("accept");
  expect(done.text).toContain("Approved");
  expect(done.text).not.toContain("Waiting for you");
  expect(done.host.querySelector("button")).toBeNull();
  done.unmount();
});

it("a declined row says Declined", () => {
  const done = draw("reject");
  expect(done.text).toContain("Declined");
  expect(done.text).not.toContain("Waiting for you");
  done.unmount();
});
