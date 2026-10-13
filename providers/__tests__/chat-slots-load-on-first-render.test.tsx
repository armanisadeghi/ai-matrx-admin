/**
 * THE CHAT REGISTRATIONS LOAD THEIR COMPONENTS ON FIRST RENDER (first-load campaign, 2026-10-13).
 *
 * ChatHostAdapter imports the three chat registration files from the root <Providers>, so every
 * module they import statically ships in the first load of every route. Their component slots
 * therefore resolve through ONE `import()` of an implementation module per file
 * (providers/chatSlotLazy.tsx). This proves, through the real registry:
 *   1. registering does NOT evaluate a lazy slot's implementation (it did when the registration
 *      file imported it statically — this assertion is red on the old files);
 *   2. the slot draws its loading footprint first, then the real component;
 *   3. the anchor-records hook registered beside them no longer drags the records reader in.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const mockEvaluated: string[] = [];

jest.mock("@/features/canvas/components/CanvasItemCard", () => {
  mockEvaluated.push("CanvasItemCard");
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return { CanvasItemCard: ({ title }: { title?: string }) => createElement("div", { "data-testid": "real-canvas-card" }, title ?? "card") };
});
jest.mock("@/features/record-change-approvals/RecordChangeApprovalCard", () => {
  mockEvaluated.push("RecordChangeApprovalCard");
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return { RecordChangeApprovalCard: () => createElement("div", { "data-testid": "real-approval-card" }, "approval") };
});
jest.mock("@/features/content-ir/records/kind-record-service", () => {
  mockEvaluated.push("kind-record-service");
  return { fetchRecordsForAnchor: async () => ({ ok: true, value: [] }) };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function settle() {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

test("registering the chat host evaluates no lazy slot implementation", () => {
  require("@/providers/chatUiRegistration");
  require("@/providers/chatAppDataRegistration");
  expect(mockEvaluated).toEqual([]);
});

test("the anchor-records hook loads the records reader with its first read only", async () => {
  const { useAnchorRecords } = require("@/features/content-ir/records/useAnchorRecords") as typeof import("@/features/content-ir/records/useAnchorRecords");
  expect(mockEvaluated).not.toContain("kind-record-service");

  function Probe({ enabled }: { enabled: boolean }) {
    const state = useAnchorRecords({ type: "conversation", id: "c-1" }, enabled);
    return <span data-status={state.status} />;
  }
  act(() => root.render(<Probe enabled={false} />));
  await settle();
  expect(mockEvaluated).not.toContain("kind-record-service");

  act(() => root.render(<Probe enabled />));
  await settle();
  expect(mockEvaluated).toContain("kind-record-service");
  expect(host.querySelector("[data-status]")?.getAttribute("data-status")).toBe("ready");
});

test("a lazy slot draws its loading footprint, then the real component, through the registry", async () => {
  require("@/providers/chatUiRegistration");
  const slots = require("@ai-matrx/chat/host/ui-slots") as typeof import("@ai-matrx/chat/host/ui-slots");
  const Card = slots.CanvasItemCard as unknown as React.ComponentType<{ title?: string }>;

  act(() => root.render(<Card title="Quarterly plan" />));
  // First frame: the footprint, never a blank and never the stand-in.
  expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
  expect(host.querySelector('[data-testid="real-canvas-card"]')).toBeNull();

  await settle();
  expect(host.querySelector('[data-testid="real-canvas-card"]')?.textContent).toBe("Quarterly plan");
  expect(host.querySelector('[aria-busy="true"]')).toBeNull();
  expect(mockEvaluated).toContain("CanvasItemCard");
});

test("a base-profile slot loads the same way", async () => {
  require("@/providers/chatUiRegistrationBase");
  const slots = require("@ai-matrx/chat/host/ui-slots") as typeof import("@ai-matrx/chat/host/ui-slots");
  const Approval = slots.RecordChangeApprovalCard as unknown as React.ComponentType<object>;

  act(() => root.render(<Approval />));
  expect(host.querySelector('[data-testid="real-approval-card"]')).toBeNull();
  await settle();
  expect(host.querySelector('[data-testid="real-approval-card"]')).not.toBeNull();
});
