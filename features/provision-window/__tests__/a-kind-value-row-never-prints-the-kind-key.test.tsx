/**
 * The Provision window's closed value row for a kind-carrying value (e.g. `provision-value-workspace`)
 * said `__kind: provision-value-workspace · ...` — the design system's key-by-key glance. It must say
 * the kind's own label; the raw `__kind` key never reaches the screen.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ValueRow } from "../ProvisionWindowBody";
import type { ProvisionValue } from "../data";
import { KIND_KEY } from "@ai-matrx/content-ir/core";

jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));
jest.mock("@/components/official/structured-value/KindValueFrontDoor", () => ({ KindValueFrontDoor: () => null }));
jest.mock("@/components/official-candidate/json-inspector/JsonInspector", () => ({ JsonInspector: () => null }));

const value = {
  name: "workspace",
  label: "Workspace",
  source: "page",
  present: true,
  withheld: false,
  chars: 40,
  items: null,
  missing_reason: null,
  value: { __kind: "provision-value-workspace", title: "Acme workspace", members: ["a", "b"] },
} as unknown as ProvisionValue;

it("a closed kind row shows the kind's label, never the raw __kind key", () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  act(() => {
    createRoot(container).render(<ValueRow v={value} />);
  });
  expect(container.textContent).not.toContain(KIND_KEY);
  expect(container.textContent).not.toContain("provision-value-workspace:");
  expect(container.textContent).toContain("Acme workspace");
});
