/**
 * WHAT'S NEW RENDERS when the catalog gains an entry the person's own sidebar has not reviewed.
 * The live catalog has no new entries yet (SHELL_CATALOG_VERSION 1, CATALOG_ADDED_IN empty), so nothing
 * on screen proves the slot works — this does: a fake catalog version (one real entry marked added in
 * version 2) and a person layout based on version 1 must render "New: <label>" with Add and Dismiss, and
 * Add must save that entry into her sidebar. A dismissed or already-placed entry must render nothing.
 */
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CATALOG_ADDED_IN, getCatalogEntry } from "@/features/shell/shell-layout/catalog";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody } from "@/features/shell/shell-layout/contract";
import { initialShellLayoutState, type ShellLayoutState } from "@/features/shell/shell-layout/shellLayoutSlice";
import { serializeShellLayoutBody } from "@/features/shell/shell-layout/validate";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The fake catalog version: one real menu entry, not in the default sidebar's top level, "added in v2".
const NEW_ID = "data.bases";
(CATALOG_ADDED_IN as Record<string, number>)[NEW_ID] = 2;

let state: { shellLayout: ShellLayoutState; userAuth: { id: string; isAdmin: boolean } };
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (selector: (s: unknown) => unknown) => selector(state) }));
jest.mock("@/features/overlays/definitions/shellLayoutEditorWindow.overlay", () => ({ useOpenShellLayoutEditor: () => jest.fn() }));
jest.mock("@/features/shell/shell-layout/editor/ShellLayoutMount", () => ({ ShellLayoutMount: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
const save = jest.fn(async (..._args: unknown[]) => ({ ok: true as const }));
jest.mock("@/features/shell/shell-layout/useShellLayoutStore", () => ({
  useShellLayoutStore: () => ({ person: state.shellLayout.person, saving: false, save }),
}));

import { WhatsNewSlot } from "./SidebarLayoutSlots";

function personBody(extra: Partial<ShellLayoutBody> = {}): ShellLayoutBody {
  return { schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 1, sidebar: [{ kind: "nav", id: "n1", ref: "workspace" }], ...extra } as ShellLayoutBody;
}

function hold(body: ShellLayoutBody) {
  state = {
    userAuth: { id: "u-1", isAdmin: false },
    shellLayout: {
      ...initialShellLayoutState,
      enabled: true,
      status: "ready",
      person: { recordId: "r-1", organizationId: "o-1", version: 3, updatedAt: "2026-10-19T00:00:00Z", body: serializeShellLayoutBody(body) },
    },
  };
}

async function render(): Promise<{ host: HTMLElement; unmount: () => void }> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<WhatsNewSlot />));
  return { host, unmount: () => act(() => root.unmount()) };
}

beforeEach(() => save.mockClear());

it("shows 'New: <label>' with Add and Dismiss, and Add saves it into her sidebar", async () => {
  const label = getCatalogEntry(NEW_ID)?.label;
  expect(label).toBeTruthy();
  hold(personBody());
  const { host, unmount } = await render();
  expect(host.textContent).toContain(`New: ${label}`);
  const add = [...host.querySelectorAll("button")].find((b) => b.textContent === "Add");
  expect(add).toBeTruthy();
  expect(host.querySelector(`button[aria-label="Dismiss ${label}"]`)).toBeTruthy();
  await act(async () => add!.click());
  expect(save).toHaveBeenCalledTimes(1);
  const saved = save.mock.calls[0]![1] as ShellLayoutBody;
  expect(JSON.stringify(saved.sidebar)).toContain(NEW_ID);
  unmount();
});

it("renders nothing once dismissed", async () => {
  hold(personBody({ dismissedNew: [NEW_ID] }));
  const { host, unmount } = await render();
  expect(host.textContent).not.toContain("New:");
  unmount();
});

it("renders nothing for a layout already based on the new catalog version", async () => {
  hold(personBody({ basedOnCatalogVersion: 2 }));
  const { host, unmount } = await render();
  expect(host.textContent).not.toContain("New:");
  unmount();
});
