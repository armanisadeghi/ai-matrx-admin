/**
 * CONNECT GMAIL FROM THE CHAT, END TO END THROUGH THE HOOK (defect C, round 2; Arman, 2026-10-20:
 * "connecting Gmail from the chat works end to end").
 *
 * The real hook and the real waits (`first-party-connect-flow.ts`, `google-status.ts`). The doubles
 * are the store's overlay flag, the lazy opener and the account read — the network and the browser.
 *
 * Mutation: answer from the first read without waiting for the dialog to close (the account has not
 * changed yet → "not connected"), or drop the dialog wait's open-wait so a late dialog is read while
 * up, and the cases below go RED.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { OpenFirstPartyConnect } from "@ai-matrx/chat/agents/connectors/first-party-connectors";
import { GOOGLE_PRODUCT_SCOPES } from "../google-status";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const overlay = {
  open: false,
  listeners: new Set<() => void>(),
  set(next: boolean) {
    overlay.open = next;
    overlay.listeners.forEach((l) => l());
  },
};
const mockStore = {
  getState: () => ({ open: overlay.open }),
  subscribe: (l: () => void) => {
    overlay.listeners.add(l);
    return () => overlay.listeners.delete(l);
  },
};
const mockAccounts: { rows: unknown[]; fail: boolean } = { rows: [], fail: false };
const mockOpenConsent = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/lib/redux/hooks", () => ({ useAppStore: () => mockStore, useAppSelector: () => "user-1" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => "user-1" }));
jest.mock("@ai-matrx/summon/boot", () => ({ selectIsOverlayOpen: (state: { open: boolean }) => state.open }));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    fetchQuery: async () => {
      if (mockAccounts.fail) throw new Error("offline");
      return { connections: mockAccounts.rows, resources: [] };
    },
  }),
}));
jest.mock("@/features/overlays/useLazyAppOpener", () => ({ useLazyAppOpener: () => mockOpenConsent }));
jest.mock("@/features/organizations/organizationsIAmIn", () => ({ liveOrganizationIdsAmong: async () => new Set<string>() }));
jest.mock("@/features/marketing/google/service", () => ({
  listGoogleConnectionInventory: jest.fn(),
  filterGoogleConnectionInventoryForUser: (inventory: unknown) => inventory,
}));
jest.mock("@/features/marketing/google/hooks", () => ({ googleConnectionKeys: { inventory: ["google", "inventory"] } }));
jest.mock("@/lib/toast", () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args), info: jest.fn(), success: jest.fn() } }));

import { useOpenFirstPartyConnect } from "../useOpenFirstPartyConnect";

let connect: OpenFirstPartyConnect;
function Harness() {
  connect = useOpenFirstPartyConnect();
  return null;
}
let root: Root;

const account = (scopes: string[], updated = "2026-10-20T10:00:00Z") => ({
  id: "acct-1",
  status: "connected",
  health: "connected",
  scopes,
  updated_at: updated,
  account_email: "p@example.com",
  account_name: null,
  owner_user_id: "user-1",
  organization_id: null,
});

beforeEach(async () => {
  overlay.open = false;
  overlay.listeners.clear();
  mockAccounts.rows = [account(["openid"])];
  mockAccounts.fail = false;
  mockOpenConsent.mockReset();
  mockToastError.mockReset();
  mockOpenConsent.mockImplementation(() => overlay.set(true));
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Harness />));
});
afterEach(async () => {
  await act(async () => root.unmount());
});

const settleMicrotasks = () => act(async () => void (await Promise.resolve()));

it("opens Google's consent with the product asked for, waits for the dialog to close, then proves the grant", async () => {
  let result: boolean | null = null;
  await act(async () => {
    void connect("google", { productKey: "gmail" }).then((r) => (result = r));
  });
  await settleMicrotasks();
  expect(mockOpenConsent).toHaveBeenCalledWith({ initialProductKeys: ["gmail"] });
  // The dialog is up, the person grants Gmail: nothing is answered while it is open.
  mockAccounts.rows = [account(["openid", GOOGLE_PRODUCT_SCOPES.gmail], "2026-10-20T10:05:00Z")];
  await settleMicrotasks();
  expect(result).toBeNull();
  await act(async () => overlay.set(false));
  await settleMicrotasks();
  expect(result).toBe(true);
});

it("a cancelled dialog (nothing changed on the account) answers false and says nothing is wrong", async () => {
  let result: boolean | null = null;
  await act(async () => {
    void connect("google", { productKey: "gmail" }).then((r) => (result = r));
  });
  await settleMicrotasks();
  await act(async () => overlay.set(false));
  await settleMicrotasks();
  expect(result).toBe(false);
  expect(mockToastError).not.toHaveBeenCalled();
});

it("a plain Google connect is proven by any product a chat can use", async () => {
  let result: boolean | null = null;
  await act(async () => {
    void connect("google").then((r) => (result = r));
  });
  await settleMicrotasks();
  expect(mockOpenConsent).toHaveBeenCalledWith({ initialProductKeys: ["workspace_files", "gmail"] });
  mockAccounts.rows = [account(["openid", GOOGLE_PRODUCT_SCOPES.gmail], "2026-10-20T10:05:00Z")];
  await act(async () => overlay.set(false));
  await settleMicrotasks();
  expect(result).toBe(true);
});

it("says so, and connects nothing, when the account cannot be read", async () => {
  mockAccounts.fail = true;
  await expect(connect("google", { productKey: "gmail" })).resolves.toBe(false);
  expect(mockToastError).toHaveBeenCalled();
  expect(mockOpenConsent).not.toHaveBeenCalled();
});

it("another provider is refused out loud", async () => {
  await expect(connect("slack")).resolves.toBe(false);
  expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining("cannot be connected from here"));
});

it("a dialog that never appears answers false with a reason, never silently", async () => {
  jest.useFakeTimers();
  try {
    mockOpenConsent.mockImplementation(() => undefined);
    let result: boolean | null = null;
    await act(async () => {
      void connect("google", { productKey: "gmail" }).then((r) => (result = r));
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(31_000);
    });
    expect(result).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining("did not open"));
  } finally {
    jest.useRealTimers();
  }
});
