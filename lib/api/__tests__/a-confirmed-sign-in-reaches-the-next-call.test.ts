/** @jest-environment node */
/**
 * "Confirm it's you" in the Vault signs in again INSIDE the tab. The next server
 * call must carry that new token. Before session-token-sync, Redux kept the
 * page-load token, so the reveal retried after confirming went out with the old
 * one, was refused, and asked again until a reload (vault parity D1).
 */
import { configureStore } from "@reduxjs/toolkit";
import type { OperationDescriptor } from "@ai-matrx/api";
import userAuthReducer, { setUserAuth } from "@/lib/redux/slices/userAuthSlice";

type Listener = (event: string, session: unknown) => void;
const listeners: Listener[] = [];
const store = configureStore({ reducer: { userAuth: userAuthReducer } });

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: {
      refreshSession: async () => ({ data: { session: null }, error: new Error("no") }),
      onAuthStateChange: (cb: Listener) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  },
}));
jest.mock("@/lib/redux/store-singleton", () => ({
  getStore: () => store,
  getStoreSingleton: () => store,
}));
jest.mock("@/lib/api/call-api", () => ({ waitForAuthReady: async () => undefined }));
jest.mock("@/lib/api/log-api-target", () => ({ logApiTarget: jest.fn() }));
jest.mock("@/lib/api/ai-test-mode", () => ({ aiTestModeHeaders: () => ({}) }));
jest.mock("@/lib/api/admin-lane", () => ({ adminLaneOrganizationId: () => null, adminLaneHeadersFor: () => ({}) }));
jest.mock("@/lib/api/organization-admission", () => ({
  waitForOrganizationAdmission: jest.fn(async () => "ready"),
  peekSelectedOrganizationId: () => null,
}));
jest.mock("@/lib/api/resolve-service-url", () => ({ resolveServiceBaseUrl: (s: string) => `https://${s}.test` }));
jest.mock("@/lib/python-client", () => ({ resolveBaseUrl: () => "https://aidream.test", resolveFilesBaseUrl: () => "https://files.test" }));
jest.mock("@/lib/services/fingerprint-service", () => ({ getCachedFingerprint: () => null }));
jest.mock("@/lib/diagnostics/capturePythonClientError", () => ({ capturePythonClientError: jest.fn(), relationPathFromUrl: (p: string) => p }));
jest.mock("@/features/entitlements/usage-gate/usageGate", () => ({ noticeUsageRefusal: jest.fn() }));
jest.mock("@/lib/organizations/organizationRefusal", () => ({ noticeNotAMemberRefusal: jest.fn() }));

import { serverApi } from "@/lib/api/server-api";

const READ: OperationDescriptor = { m: "GET", p: "/vault/items/{id}", d: "aidream", a: "user", o: "optional", n: "test.read" };
const ME = "4cf62e4e-2679-484d-b652-c0ba5d3e3c5a";
const SOMEONE_ELSE = "11111111-2222-3333-4444-555555555555";

let fetchMock: jest.Mock;
const bearer = (i: number) => {
  const init = fetchMock.mock.calls[i]?.[1] as RequestInit;
  const h = init.headers as Record<string, string> | Headers;
  return h instanceof Headers ? h.get("authorization") : (h["Authorization"] ?? h["authorization"]);
};
const emit = (event: string, session: unknown) => listeners.forEach((l) => l(event, session));

beforeEach(() => {
  store.dispatch(setUserAuth({ id: ME, accessToken: "page-load-token" }));
  fetchMock = jest.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

it("the call after a fresh sign-in carries the NEW token, with no reload", async () => {
  await serverApi.call(READ, { path: { id: "a" } });
  expect(bearer(0)).toBe("Bearer page-load-token");
  // What supabase-js reports when "Confirm it's you" signs the same person in again.
  emit("SIGNED_IN", { access_token: "confirmed-token", expires_at: 999, user: { id: ME } });
  await serverApi.call(READ, { path: { id: "a" } });
  expect(bearer(1)).toBe("Bearer confirmed-token");
});

it("a token refresh is followed too", async () => {
  await serverApi.call(READ, { path: { id: "a" } });
  emit("TOKEN_REFRESHED", { access_token: "refreshed-token", expires_at: 1000, user: { id: ME } });
  await serverApi.call(READ, { path: { id: "a" } });
  expect(bearer(1)).toBe("Bearer refreshed-token");
});

it("a DIFFERENT person's session is never adopted (identity drift is the watcher's)", async () => {
  await serverApi.call(READ, { path: { id: "a" } });
  emit("SIGNED_IN", { access_token: "their-token", user: { id: SOMEONE_ELSE } });
  await serverApi.call(READ, { path: { id: "a" } });
  expect(bearer(1)).toBe("Bearer page-load-token");
});
