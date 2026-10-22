/**
 * @jest-environment jsdom
 *
 * L32 / defect 61: the sidebar Error Inspector badge said "2" while the
 * inspector it opened showed a different list. ONE store feeds both; the badge
 * counts the loud (red) tier, so the inspector must OPEN on exactly the set the
 * badge counted — and the title count must be the number of rows listed.
 * Counted entry => listed; listed-by-default => counted.
 */
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@ai-matrx/summon/window", () => ({
  WindowPanel: ({ titleNode, sidebar, children }: any) => (
    <div>
      <div data-testid="title">{titleNode}</div>
      <div data-testid="sidebar">{sidebar}</div>
      <div>{children}</div>
    </div>
  ),
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: () => true,
  useAppDispatch: () => jest.fn(),
}));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectIsAdminDebugger: () => true }));
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectIsAdminDebugger: () => true }));
jest.mock("@ai-matrx/summon/open", () => ({ selectIsOverlayOpen: () => false, toggleOverlay: jest.fn() }));
jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/design-system/data-table/uuid-cell", () => ({ MatrxUuidCell: () => null }));
jest.mock("@ai-matrx/records-ui/entity-doors", () => ({
  ...jest.requireActual("@ai-matrx/records-ui/entity-doors"),
  isUuidValue: () => false,
}));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Input: (p: any) => <input {...p} />,
}));
jest.mock("@/components/ui/scroll-area", () => ({ ScrollArea: ({ children }: any) => <div>{children}</div> }));
jest.mock("@/components/ui/button", () => ({ Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button> }));
jest.mock("@ai-matrx/kit/format", () => ({ formatRelativeTime: () => "now" }));
jest.mock("@/features/admin/error-inspector/useOpenErrorInspector", () => ({
  ERROR_INSPECTOR_OVERLAY_ID: "errorInspectorWindow",
}));

import ErrorInspectorWindow from "../ErrorInspectorWindow";
import SidebarErrorInspectorToggle from "@/features/shell/components/controls/SidebarErrorInspectorToggle";
import {
  captureError,
  clearCapturedErrors,
  dismissCapturedError,
  getSnapshot,
} from "@/lib/diagnostics/errorCaptureStore";

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function mount(el: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(el));
}

function badgeNumber(): number {
  const el = document.querySelector(".shell-nav-badge-expanded");
  return el ? Number(el.textContent) : 0;
}

function listedRows(): number {
  return document.querySelectorAll('[data-testid="sidebar"] ul > li').length;
}

beforeEach(() => {
  document.body.innerHTML = "";
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.sessionStorage.clear();
  clearCapturedErrors();
});

it("a mixed-tier store: badge counts red only and the window opens on red only", async () => {
  captureError({ source: "supabase-postgrest", message: "loud one" });
  captureError({ source: "supabase-postgrest", message: "loud two" });
  // an orange entry: a stream cancel by the caller classifies below red
  captureError({ source: "app-api-http", message: "soft one" }); // orange by rule
  captureError({ source: "hard-navigation", code: "link", message: "nav" }); // yellow by rule
  const tiers = getSnapshot().map((r) => r.tier);
  expect(new Set(tiers).size).toBeGreaterThan(1);
  const reds = tiers.filter((t) => t === "red").length;

  mount(<SidebarErrorInspectorToggle />);
  await flush();
  expect(badgeNumber()).toBe(reds);
  mount(<ErrorInspectorWindow isOpen onClose={() => {}} />);
  await flush();
  expect(listedRows()).toBe(reds);
  expect(document.querySelector('[data-testid="title"]')!.textContent).toContain(String(reds));
});

it("dismiss updates badge and list together", async () => {
  captureError({ source: "supabase-postgrest", message: "a" });
  captureError({ source: "supabase-postgrest", message: "b" });
  mount(<SidebarErrorInspectorToggle />);
  mount(<ErrorInspectorWindow isOpen onClose={() => {}} />);
  await flush();
  expect(badgeNumber()).toBe(2);
  expect(listedRows()).toBe(2);
  act(() => dismissCapturedError(getSnapshot()[0].id));
  await flush();
  expect(badgeNumber()).toBe(1);
  expect(listedRows()).toBe(1);
  act(() => clearCapturedErrors());
  await flush();
  expect(badgeNumber()).toBe(0);
  expect(listedRows()).toBe(0);
});
