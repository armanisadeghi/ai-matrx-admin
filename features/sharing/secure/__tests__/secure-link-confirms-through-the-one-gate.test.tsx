/**
 * Sending a password by secure link needs a recent sign-in. It is confirmed through the vault's ONE
 * "Confirm it's you" (`@ai-matrx/vault` IdentityGate) — so a Google-only person can confirm, and the
 * send runs again by itself. The old second dialog took only a password.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { VaultIdentity } from "@ai-matrx/vault";

import { SecureLinkPanel } from "../SecureLinkPanel";
import { SecureDeliveryRefusal, sendSecureDelivery } from "../secureDeliveryService";

jest.mock("@/features/secrets/webVaultIdentity", () => ({
  webVaultIdentity: {
    account: async () => ({ email: "admin@admin.com", providers: ["google"], hasPassword: false }),
    withProvider: jest.fn(async () => "confirmed"),
    withPassword: async () => undefined,
    sendEmailCode: async () => undefined,
    withEmailCode: async () => undefined,
  },
}));
const googleOnly = (jest.requireMock("@/features/secrets/webVaultIdentity") as { webVaultIdentity: VaultIdentity & { withProvider: jest.Mock } }).webVaultIdentity;
jest.mock("@/lib/redux/hooks", () => {
  const dispatch = jest.fn();
  return { useAppDispatch: () => dispatch };
});
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: jest.fn() }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("../secureDeliveryService", () => {
  class SecureDeliveryRefusal extends Error {
    constructor(message: string, readonly code: string, readonly remedy: string | null) {
      super(message);
    }
  }
  return {
    SecureDeliveryRefusal,
    fetchSecureDeliveryOptions: jest.fn(async () => ({ protected_fields: [], link_ttl_minutes: 60 })),
    fetchRecipientPhoneOnFile: jest.fn(async () => null),
    listSentSecureDeliveries: jest.fn(async () => []),
    revokeSecureDelivery: jest.fn(),
    sendSecureDelivery: jest.fn(),
  };
});

const sendMock = jest.mocked(sendSecureDelivery);
let root: Root;
let host: HTMLElement;
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 30))));
const button = (text: string) => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(text));

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
});

test("a Google-only person confirms with Google and the send runs again by itself", async () => {
  sendMock
    .mockRejectedValueOnce(new SecureDeliveryRefusal("Confirm it is you.", "recent_auth_required", null))
    .mockResolvedValueOnce({ same_channel: false, sentence: "Sent to friend@example.com." } as never);
  await act(async () => root.render(<SecureLinkPanel resourceType="credential_item" resourceId="i1" resourceName="ZZ" />));
  await settle();
  const email = document.querySelector<HTMLInputElement>('input[type="email"], input[id*="email" i]');
  expect(email).not.toBeNull();
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    set?.call(email, "friend@example.com");
    email!.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("Send secure link")?.click());
  await settle();
  // The ONE gate, offering what this account uses: Google, and no password box.
  expect(document.body.textContent).toContain("Confirm it’s you");
  expect(button("Continue with Google")).toBeDefined();
  expect(document.querySelector('input[type="password"]')).toBeNull();
  await act(async () => button("Continue with Google")?.click());
  await settle();
  expect(googleOnly.withProvider).toHaveBeenCalledWith("google");
  expect(sendMock).toHaveBeenCalledTimes(2);
  expect(document.body.textContent).toContain("Sent to friend@example.com.");
});
