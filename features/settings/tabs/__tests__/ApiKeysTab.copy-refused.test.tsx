/**
 * @jest-environment jsdom
 *
 * A new API key is shown once. When the browser refuses the clipboard (the kit copy resolves
 * `false`, it never throws) the person must be told to copy it by hand before closing — AP-2
 * regression: that message sat in a `catch` that could never run. The words ride the kit copy
 * (its one notice), so the tab adds no toast of its own either way.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const copyText = jest.fn<Promise<boolean>, [string, string?, string?]>();
const toastError = jest.fn();
const toastSuccess = jest.fn();
jest.mock("@ai-matrx/kit/clipboard", () => ({ useClipboard: () => ({ copyText }) }));
jest.mock("@/lib/toast", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) },
}));
jest.mock("@/components/ui/button", () => ({
  Button: (p: { children?: React.ReactNode; onClick?: () => void; "aria-label"?: string }) => (
    <button type="button" aria-label={p["aria-label"]} onClick={p.onClick}>
      {p.children}
    </button>
  ),
}));
jest.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: () => null }));
jest.mock("@ai-matrx/design-system", () => ({ ErrorNotice: () => null }));
jest.mock("@ai-matrx/design-system/settings", () => ({
  ...jest.requireActual("@ai-matrx/design-system/settings"),
  SettingsSection: (p: { title?: string; action?: React.ReactNode; children?: React.ReactNode }) => (
    <section>
      {p.title}
      {p.action}
      {p.children}
    </section>
  ),
  SettingsSubHeader: () => null,
  SettingsCallout: (p: { children?: React.ReactNode }) => <div>{p.children}</div>,
  SettingsRow: (p: { children?: React.ReactNode }) => <div>{p.children}</div>,
  SettingsTextInput: (p: { label: string; value: string; onValueChange: (v: string) => void }) => (
    <input aria-label={p.label} value={p.value} onChange={(e) => p.onValueChange(e.target.value)} />
  ),
  SettingsSelect: () => null,
  SettingsButton: (p: { actionLabel: string; onClick: () => void }) => (
    <button type="button" onClick={p.onClick}>
      {p.actionLabel}
    </button>
  ),
}));
jest.mock("@/features/organizations/hooks", () => ({
  useUserOrganizations: () => ({ organizations: [{ id: "org-1", name: "Clinic" }], loading: false, error: null }),
}));
// The chooser draws design-system Popover/Picker parts this file's partial design-system mock does not carry;
// the copy behavior under test is independent of it (same double as OAuthAppsTab.register.test).
jest.mock("@/features/organizations/components/OrganizationChooser", () => ({
  OrganizationChooser: () => <span>Clinic</span>,
}));
jest.mock("@/features/settings/personalApiKeysService", () => ({
  PERSONAL_API_BASE_URL: "https://api.example",
  listPersonalApiKeys: jest.fn(async () => []),
  revokePersonalApiKey: jest.fn(),
  createPersonalApiKey: jest.fn(async () => ({
    id: "k1",
    name: "usage tracker",
    api_key: "mx_live_only_shown_once",
    expiry_capped: false,
    expires_at: null,
  })),
}));

import ApiKeysTab from "../ApiKeysTab";

let container: HTMLDivElement;
let root: Root;
const button = (text: string) =>
  [...container.querySelectorAll("button")].find(
    (b) => b.textContent === text || b.getAttribute("aria-label") === text,
  )!;

beforeEach(() => {
  copyText.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function createKeyThenCopy() {
  await act(async () => root.render(<ApiKeysTab />));
  await act(async () => button("New key").click());
  const input = container.querySelector<HTMLInputElement>("input[aria-label=Name]")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "usage tracker");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("Create").click());
  expect(container.textContent).toContain("mx_live_only_shown_once");
  await act(async () => button("Copy key").click());
}

it("tells the person to copy the one-time key by hand when the clipboard refuses", async () => {
  copyText.mockResolvedValue(false);
  await createKeyThenCopy();
  expect(copyText).toHaveBeenCalledWith(
    "mx_live_only_shown_once",
    "Key copied",
    expect.stringContaining("copy it by hand"),
  );
  expect(toastError).not.toHaveBeenCalled();
  expect(toastSuccess).not.toHaveBeenCalled();
  expect(button("Copy key")).toBeDefined();
});

it("confirms only a copy that landed", async () => {
  copyText.mockResolvedValue(true);
  await createKeyThenCopy();
  expect(copyText).toHaveBeenCalledWith("mx_live_only_shown_once", "Key copied", expect.any(String));
  // ONE notice: the kit says "Key copied"; the tab adds nothing.
  expect(toastSuccess).not.toHaveBeenCalled();
  expect(toastError).not.toHaveBeenCalled();
  expect(button("Copied")).toBeDefined();
});
