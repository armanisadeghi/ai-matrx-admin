/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VoiceTransferReceipt } from "./VoiceTransferReceipt";
import { loadTransferReceipt } from "./transfer-receipt-service";
import type { VoiceTransferReceipt as Receipt } from "@/lib/communications/voice/transfer-receipt";
jest.mock("./transfer-receipt-service", () => ({
  loadTransferReceipt: jest.fn(),
}));
jest.mock("@ai-matrx/design-system/controls", () => ({
  ...jest.requireActual("@ai-matrx/design-system/controls"), InfoHint: () => null }));
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const read = jest.mocked(loadTransferReceipt);
const consistent: Receipt = {
  state: "consistent",
  connection: "connected",
  interactionId: "call",
  organizationId: "org",
  deliveryCount: 7,
  firstEventId: 1,
  lastEventId: 17,
  result: {
    providerAccountId: "AC" + "1".repeat(32),
    providerCallId: "CA" + "2".repeat(32),
    providerDialCallId: "CA" + "3".repeat(32),
    status: "completed",
    durationSeconds: 12,
    bridged: true,
  },
};
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  jest.clearAllMocks();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
async function review() {
  await act(async () => {
    host.querySelector("button")?.click();
  });
}
test.each([
  { receipt: consistent, label: "Connected" },
  {
    receipt: { ...consistent, connection: "not-connected" } satisfies Receipt,
    label: "Not connected",
  },
  {
    receipt: { ...consistent, connection: "unknown" } satisfies Receipt,
    label: "Unconfirmed",
  },
  {
    receipt: {
      state: "conflict",
      deliveryCount: 7,
      firstEventId: 1,
      lastEventId: 17,
    } satisfies Receipt,
    label: "Conflicting evidence",
  },
])(
  "reviewing evidence renders $label and delivery count from the real loader result",
  async ({ receipt, label }) => {
    read.mockResolvedValue(receipt);
    await act(async () =>
      root.render(<VoiceTransferReceipt eventId={17} callId="call" />),
    );
    expect(read).not.toHaveBeenCalled();
    await review();
    expect(read).toHaveBeenCalledWith(17, "call");
    expect(host.querySelector('[role="status"]')?.textContent).toContain(label);
    expect(host.textContent).toContain("Callbacks: 7");
  },
);
test("refresh failure clears stale connection and leaves retry available", async () => {
  read
    .mockResolvedValueOnce(consistent)
    .mockRejectedValueOnce(Error("Evidence unavailable"));
  await act(async () =>
    root.render(<VoiceTransferReceipt eventId={17} callId="call" />),
  );
  await review();
  expect(host.textContent).toContain("Connected");
  await review();
  expect(host.textContent).not.toContain("Connected");
  expect(host.textContent).toContain("Evidence unavailable");
  expect(host.querySelector("button")?.disabled).toBe(false);
});
