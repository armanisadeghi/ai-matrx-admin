/**
 * @jest-environment jsdom
 *
 * AT-STOREFIX (AT-WALK-E3 defect 3): "Sync into another workspace" to a workspace with no data home said so in a toast and
 * nothing else. Now the refusal is written IN the dialog, the dialog stays open, and Sync works again for a retry.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NO_HOME = "The destination workspace has no data home yet. Open its Data page once and sync again.";
const tableCopySync = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@ai-matrx/records/core", () => ({ createRecordsClient: () => ({ tableCopySync: (...a: unknown[]) => tableCopySync(...a) }) }));
const stableClient = { config: { organizationId: "org-src" }, views: async () => ({ ok: true, data: [] }) };
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => stableClient }));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Button: (p: { children?: React.ReactNode; onClick?: () => void; disabled?: boolean; "aria-label"?: string }) => (
    <button type="button" aria-label={p["aria-label"]} disabled={p.disabled} onClick={p.onClick}>{p.children}</button>
  ),
  Select: () => null,
}), { virtual: true });
jest.mock("@/components/ui/dialog", () => ({
  Dialog: (p: { open: boolean; children?: React.ReactNode }) => (p.open ? <div>{p.children}</div> : null),
  DialogContent: (p: { children?: React.ReactNode }) => <div>{p.children}</div>,
  DialogHeader: (p: { children?: React.ReactNode }) => <div>{p.children}</div>,
  DialogTitle: (p: { children?: React.ReactNode }) => <h2>{p.children}</h2>,
}));
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: (p: { children?: React.ReactNode }) => <>{p.children}</>,
  TooltipTrigger: (p: { children?: React.ReactNode }) => <>{p.children}</>,
  TooltipContent: () => null,
}));
jest.mock("@/features/organizations/components/OrganizationChooser", () => ({
  OrganizationChooser: (p: { onChange: (o: { id: string }) => void }) => (
    <button type="button" onClick={() => p.onChange({ id: "org-empty" })}>pick-empty-org</button>
  ),
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import { SyncIntoWorkspaceButton } from "../SyncIntoWorkspaceButton";

let container: HTMLDivElement;
let root: Root;
const btn = (t: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === t || b.getAttribute("aria-label") === t)!;

beforeEach(() => {
  tableCopySync.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("says a workspace with no data home in the dialog and lets the person press Sync again", async () => {
  tableCopySync.mockResolvedValueOnce({ ok: false, error: { message: NO_HOME } }).mockResolvedValueOnce({ ok: true, data: { table_id: "t2", rows_total: 3 } });
  await act(async () => root.render(<SyncIntoWorkspaceButton tableId="t1" organizationId="org-src" />));
  await act(async () => btn("Sync into another workspace").click());
  await act(async () => btn("pick-empty-org").click());
  await act(async () => btn("Sync").click());
  expect(tableCopySync).toHaveBeenCalledTimes(1);
  const note = container.querySelector("[data-sync-into-workspace-no-home]");
  expect(note?.textContent).toContain("no data home");
  expect(container.querySelector("[data-sync-into-workspace-form]")).not.toBeNull();
  expect((btn("Sync") as HTMLButtonElement).disabled).toBe(false);
  await act(async () => btn("Sync").click());
  expect(tableCopySync).toHaveBeenCalledTimes(2);
  expect(container.querySelector("[data-sync-into-workspace-no-home]")).toBeNull();
});
