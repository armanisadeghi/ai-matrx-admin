/**
 * Google One Tap: a signed-out visitor is prompted with the knob's auto-select and a HASHED nonce; the
 * token Google returns goes to the server with the RAW nonce (Supabase hashes it and compares), and a
 * signed-in person is never prompted.
 */
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createHash, webcrypto } from "node:crypto";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let claimsUser: { id: string; is_anonymous?: boolean } | null = null;
jest.mock("@/utils/supabase/clientClaimsCache", () => ({
  getClientClaimsUserCached: async () => ({ data: { user: claimsUser }, error: null }),
}));
jest.mock("@/lib/services/fingerprint-service", () => ({ getFingerprint: async () => "visitor-fp-1234567890" }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));
let mockPathname = "/pricing";
const signIn = jest.fn(async () => ({ ok: true as const }));
jest.mock("../actions", () => ({ signInWithGoogleOneTap: (...args: unknown[]) => signIn(...(args as [])) }));

const initialize = jest.fn();
const prompt = jest.fn();
const disableAutoSelect = jest.fn();
jest.mock("@/providers/google-provider/googleIdentityId", () => ({
  loadGoogleIdentityId: async () => {
    (window as unknown as { google: unknown }).google = {
      accounts: { id: { initialize, prompt, cancel: jest.fn(), disableAutoSelect } },
    };
    return true;
  },
}));

const land = jest.fn();
jest.mock("../landAfterSignIn", () => ({ landAfterSignIn: (...args: unknown[]) => land(...(args as [])) }));

import { GoogleOneTap } from "../GoogleOneTap";

const settle = () => act(async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); });

async function mount(props: React.ComponentProps<typeof GoogleOneTap>) {
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => root.render(<GoogleOneTap {...props} />));
  await settle();
  return root;
}

beforeAll(() => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto });
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "web-client.apps.googleusercontent.com";
});
beforeEach(() => {
  initialize.mockClear();
  prompt.mockClear();
  signIn.mockClear();
  land.mockClear();
  claimsUser = null;
  mockPathname = "/pricing";
});

it("prompts a signed-out visitor with FedCM, the knob's auto-select and a hashed nonce", async () => {
  const root = await mount({ autoSelect: true });
  expect(initialize).toHaveBeenCalledTimes(1);
  const config = initialize.mock.calls[0][0];
  expect(config).toMatchObject({ client_id: "web-client.apps.googleusercontent.com", auto_select: true, use_fedcm_for_prompt: true });
  expect(config.nonce).toMatch(/^[0-9a-f]{64}$/);
  expect(prompt).toHaveBeenCalledTimes(1);

  await act(async () => config.callback({ credential: "id-token" }));
  await settle();
  expect(signIn).toHaveBeenCalledTimes(1);
  const sent = (signIn.mock.calls[0] as unknown as [{ credential: string; nonce: string; visitorId: string }])[0];
  expect(sent.credential).toBe("id-token");
  expect(sent.visitorId).toBe("visitor-fp-1234567890");
  // The raw nonce goes to the server; Google got its SHA-256.
  expect(createHash("sha256").update(sent.nonce).digest("hex")).toBe(config.nonce);
  expect(land).toHaveBeenCalledWith(undefined);
  act(() => root.unmount());
});

it("opens the destination after sign-in on the auth pages", async () => {
  const root = await mount({ autoSelect: false, context: "signin", destination: "/agents" });
  const config = initialize.mock.calls[0][0];
  expect(config.auto_select).toBe(false);
  await act(async () => config.callback({ credential: "id-token" }));
  await settle();
  expect(land).toHaveBeenCalledWith("/agents");
  act(() => root.unmount());
});

it("never prompts a signed-in person", async () => {
  claimsUser = { id: "u-1" };
  const root = await mount({ autoSelect: true });
  expect(initialize).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it("stays quiet on a skipped path", async () => {
  mockPathname = "/unsubscribe/abc";
  const root = await mount({ autoSelect: true, skipPrefixes: ["/unsubscribe"] });
  expect(initialize).not.toHaveBeenCalled();
  act(() => root.unmount());
});

it("a failed sign-in turns auto-select off so it cannot fail again on every load", async () => {
  signIn.mockImplementationOnce(async () => ({ ok: false, error: "nope" }) as never);
  disableAutoSelect.mockClear();
  const root = await mount({ autoSelect: true });
  await act(async () => initialize.mock.calls[0][0].callback({ credential: "bad" }));
  await settle();
  expect(disableAutoSelect).toHaveBeenCalledTimes(1);
  expect(land).not.toHaveBeenCalled();
  act(() => root.unmount());
});
