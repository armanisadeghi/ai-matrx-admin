/**
 * @jest-environment jsdom
 *
 * OAuth apps (AT-OAUTH): a person registers an app with a name, redirect URLs and scopes in the
 * organization they pick; the client id and the ONE-time secret are shown, then hidden for good.
 * The consent screen's data-scope lines come from the same labels.
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
  SettingsRow: (p: { children?: React.ReactNode; label?: string; meta?: React.ReactNode; description?: React.ReactNode }) => (
    <div>
      {p.label}
      {p.meta}
      {p.description}
      {p.children}
    </div>
  ),
  SettingsTextInput: (p: { label: string; value: string; onValueChange: (v: string) => void }) => (
    <input aria-label={p.label} value={p.value} onChange={(e) => p.onValueChange(e.target.value)} />
  ),
  SettingsButton: (p: { actionLabel: string; onClick: () => void }) => (
    <button type="button" onClick={p.onClick}>
      {p.actionLabel}
    </button>
  ),
}));
let mockOrgs: { id: string; name: string }[] = [{ id: "org-1", name: "Clinic" }];
jest.mock("@/features/organizations/hooks", () => ({
  useUserOrganizations: () => ({ organizations: mockOrgs, loading: false, error: null }),
}));
jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: (p: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <input type="checkbox" checked={!!p.checked} onChange={(e) => p.onCheckedChange?.(e.target.checked)} />
  ),
}));
jest.mock("@/components/ui/textarea", () => ({
  Textarea: (p: { value: string; onChange: (e: { target: { value: string } }) => void; "aria-label"?: string }) => (
    <textarea aria-label={p["aria-label"]} value={p.value} onChange={(e) => p.onChange(e)} />
  ),
}));
jest.mock("@/features/organizations/components/OrganizationChooser", () => ({
  OrganizationChooser: (p: { onChange: (o: { id: string; name: string; slug: string }) => void }) => (
    <button type="button" onClick={() => p.onChange({ id: "org-active", name: "admin's Workspace", slug: "w" })}>
      pick-active-org
    </button>
  ),
}));

const registerOAuthApp = jest.fn();
const listOAuthApps = jest.fn(async () => [] as unknown[]);
jest.mock("@/features/settings/oauthAppsService", () => {
  const real = jest.requireActual("@/features/settings/oauthAppsService");
  return {
    ...real,
    listOAuthApps: () => listOAuthApps(),
    registerOAuthApp: (...a: unknown[]) => registerOAuthApp(...a),
    removeOAuthApp: jest.fn(),
  };
});
jest.mock("@/lib/api/server-api", () => ({ serverApi: { call: jest.fn() } }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import OAuthAppsTab from "../OAuthAppsTab";
import { appScopeLines, parseRedirectUris } from "@/features/settings/oauthAppsService";

let container: HTMLDivElement;
let root: Root;
const button = (text: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === text)!;

function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() => {
  registerOAuthApp.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("registers an app in the chosen organization and shows the secret exactly once", async () => {
  registerOAuthApp.mockResolvedValue({
    id: "a1", client_id: "client-123", client_secret: "secret-shown-once", name: "Inventory sync",
    redirect_uris: ["https://app.example.com/cb"], scopes: ["data.records:read"],
    authorize_url: "https://www.aimatrx.com/api/oauth/authorize", token_url: "https://www.aimatrx.com/api/oauth/token",
  });
  await act(async () => root.render(<OAuthAppsTab />));
  await act(async () => button("New app").click());
  await act(async () => type(container.querySelector<HTMLInputElement>("input[aria-label=Name]")!, "Inventory sync"));
  await act(async () =>
    type(container.querySelector<HTMLTextAreaElement>("textarea")!, "https://app.example.com/cb\n\nhttps://app.example.com/cb"),
  );
  await act(async () => button("Register").click());
  expect(registerOAuthApp).toHaveBeenCalledWith("org-1", {
    name: "Inventory sync", redirect_uris: ["https://app.example.com/cb"], scopes: ["data.records:read"],
  });
  expect(container.textContent).toContain("client-123");
  expect(container.querySelector("[data-secret=oauth-client-secret]")?.textContent).toBe("secret-shown-once");
  await act(async () => button("Done").click());
  expect(container.textContent).not.toContain("secret-shown-once");
});

it("keeps the one-time secret on screen across a remount until Done (AT-STOREFIX)", async () => {
  registerOAuthApp.mockResolvedValue({
    id: "a3", client_id: "client-remount", client_secret: "secret-survives-remount", name: "Remount app",
    redirect_uris: ["https://app.example.com/cb"], scopes: ["data.records:read"], authorize_url: "u", token_url: "t",
  });
  await act(async () => root.render(<OAuthAppsTab />));
  await act(async () => button("New app").click());
  await act(async () => type(container.querySelector<HTMLInputElement>("input[aria-label=Name]")!, "Remount app"));
  await act(async () => type(container.querySelector<HTMLTextAreaElement>("textarea")!, "https://app.example.com/cb"));
  await act(async () => button("Register").click());
  expect(container.textContent).toContain("secret-survives-remount");
  // The page remounts the tab (it shows "Loading your apps" again): the secret is still there.
  await act(async () => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(<OAuthAppsTab />));
  expect(container.querySelector("[data-secret=oauth-client-secret]")?.textContent).toBe("secret-survives-remount");
  await act(async () => button("Done").click());
  expect(container.textContent).not.toContain("secret-survives-remount");
});

it("picking an organization (even the active one) enables Register and registers there", async () => {
  mockOrgs = [{ id: "org-1", name: "Clinic" }, { id: "org-active", name: "admin's Workspace" }];
  registerOAuthApp.mockResolvedValue({
    id: "a2", client_id: "c2", client_secret: "s2", name: "X", redirect_uris: ["https://a.example.com/cb"],
    scopes: ["data.records:read"], authorize_url: "u", token_url: "t",
  });
  try {
    await act(async () => root.render(<OAuthAppsTab />));
    await act(async () => button("New app").click());
    await act(async () => type(container.querySelector<HTMLInputElement>("input[aria-label=Name]")!, "X"));
    await act(async () => type(container.querySelector<HTMLTextAreaElement>("textarea")!, "https://a.example.com/cb"));
    await act(async () => button("Register").click());
    expect(registerOAuthApp).not.toHaveBeenCalled();
    await act(async () => button("pick-active-org").click());
    await act(async () => button("Register").click());
    expect(registerOAuthApp).toHaveBeenCalledWith("org-active", expect.objectContaining({ name: "X" }));
  } finally {
    mockOrgs = [{ id: "org-1", name: "Clinic" }];
  }
});

it("names the data scopes in fixed order and drops unknown ones", () => {
  expect(appScopeLines(["schema.bases:read", "nope", "data.records:write"]).map((l) => l.scope)).toEqual([
    "data.records:write", "schema.bases:read",
  ]);
  expect(appScopeLines(null)).toEqual([]);
  expect(parseRedirectUris(" https://a.example.com/cb ,\nmyapp://cb\n\nhttps://a.example.com/cb")).toEqual([
    "https://a.example.com/cb", "myapp://cb",
  ]);
});
