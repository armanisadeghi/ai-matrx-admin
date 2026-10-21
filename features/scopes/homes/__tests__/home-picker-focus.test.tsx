/** @jest-environment jsdom */
//
// "Move to…" from a tab's "…" menu, the bulk bar and Ctrl/⌘+Shift+M opens THE home picker in a
// dialog. The dialog's focus trap put focus on its Close button, so the name the person typed
// went nowhere (walk 2026-10-21, real keystrokes). The filter is focused on open.

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView ??= () => {};

jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn(), useAppSelector: () => undefined }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/features/scopes/redux/thunks/scopeTreeMutations", () => ({ createScope: jest.fn() }));
jest.mock("../useHomeChoices", () => ({
  useHomeChoices: () => ({
    homes: [
      { scopeId: "h1", name: "General", organizationId: "o1", organizationName: "Ashford Labs", scopeTypeId: "g", scopeTypeLabel: "General", isGeneral: true },
      { scopeId: "h2", name: "General", organizationId: "o2", organizationName: "Oak Street Studio", scopeTypeId: "g", scopeTypeLabel: "General", isGeneral: true },
    ],
    organizations: [],
    status: "ready",
  }),
}));

import { HomePickerList } from "../HomePickerList";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function openInDialog(autoFocus?: boolean) {
  await act(async () => {
    root.render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Move note to…</DialogTitle>
          <HomePickerList currentScopeId="h1" initialOrganizationId="o1" onPick={jest.fn()} autoFocus={autoFocus} />
        </DialogContent>
      </Dialog>,
    );
  });
  await act(async () => new Promise((r) => setTimeout(r, 0)));
  return document.querySelector('input[placeholder="Find a home"]') as HTMLInputElement;
}

describe("home picker in a dialog", () => {
  it("opens with the filter focused, so typing filters at once", async () => {
    const input = await openInDialog();
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it("without autofocus the dialog's trap lands elsewhere (the defect this guards)", async () => {
    const input = await openInDialog(false);
    expect(document.activeElement).not.toBe(input);
  });
});
