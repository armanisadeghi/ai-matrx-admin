/** @jest-environment jsdom */
// Visiting /agents/new/manual must not insert anything; the agent row is
// created only when the person submits (first save).
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createAgentFromSeed = jest.fn((..._args: unknown[]) => Promise.resolve());

jest.mock("@/lib/agents/actions", () => ({
  createAgentFromSeed: (...a: unknown[]) => createAgentFromSeed(...a),
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: () => "org-1",
}));
jest.mock("@/lib/redux/slices/appContextSlice", () => ({
  selectOrganizationId: () => "org-1",
}));
jest.mock("@/features/organizations/useOrganizationRequired", () => ({
  useOrganizationRequired: () => ({ organizationState: "ready" }),
}));
jest.mock("@/features/organizations/components/OrganizationRequiredNotice", () => ({
  OrganizationContextNotice: () => <div>org notice</div>,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({
  ErrorAlchemyMenu: () => null,
}));
jest.mock("@ai-matrx/chat/agents/constants/blank-agent", () => ({
  BLANK_AGENT_SEED: {
    name: "Untitled Agent",
    messages: [{ role: "system", content: [{ type: "text", text: "" }] }],
  },
}));

import { CreateManualAgentClient } from "./CreateManualAgentClient";

let container: HTMLDivElement;
let root: Root;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<CreateManualAgentClient />);
  });
}

function type(el: Element, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("/agents/new/manual", () => {
  beforeEach(() => createAgentFromSeed.mockClear());
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("creates nothing on mount, even with an organization selected", async () => {
    await mount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(createAgentFromSeed).not.toHaveBeenCalled();
  });

  it("creates exactly one agent on the first save, carrying what was typed", async () => {
    await mount();
    await act(async () => {
      type(container.querySelector("#new-agent-name")!, "Lease reviewer");
      type(container.querySelector("#new-agent-instructions")!, "Review leases.");
    });
    const form = container.querySelector("form")!;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(createAgentFromSeed).toHaveBeenCalledTimes(1);
    const [seed, org] = createAgentFromSeed.mock.calls[0] as [
      { name: string; messages: { content: { text: string }[] }[] },
      string,
    ];
    expect(org).toBe("org-1");
    expect(seed.name).toBe("Lease reviewer");
    expect(seed.messages[0].content[0].text).toBe("Review leases.");
  });
});
