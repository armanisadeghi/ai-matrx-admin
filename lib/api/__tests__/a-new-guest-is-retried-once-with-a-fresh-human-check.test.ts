// Under auth.guest_identity/turnstile_at_mint=enforce aidream refuses to mint a new visitor whose
// first request carries no passing human check: 403 guest_challenge_failed, before any handler ran.
// callApi mints the visitor once more (ensureGuestIdentity fresh, lib/guest/turnstile.ts) and retries
// ONCE; a signed-in call never does, and a failed mint is not retried.
import { callApi } from "../call-api";
import apiConfigReducer from "@/lib/redux/slices/apiConfigSlice";
import appContextReducer from "@/lib/redux/slices/appContextSlice";
import userAuthReducer, { setAccessToken, setAuthReady } from "@/lib/redux/slices/userAuthSlice";
import userProfileReducer from "@/lib/redux/slices/userProfileSlice";
import type { RootState } from "@/lib/redux/store";
import { clearCapturedErrors } from "@/lib/diagnostics/errorCaptureStore";

const mockTokens: boolean[] = [];
const mockFreshAsks: Array<{ fresh?: boolean } | undefined> = [];
jest.mock("@/lib/guest/turnstile", () => {
  const actual = jest.requireActual("@/lib/guest/turnstile");
  return {
    ...actual,
    ensureGuestIdentity: async (o?: { fresh?: boolean }) => {
      if (!o?.fresh) return true;
      mockFreshAsks.push(o);
      return mockTokens.shift() ?? false;
    },
  };
});
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "5dc930e9-bd65-44a1-8369-af773f6e1a5b" }));
jest.mock("@/lib/api/admin-lane", () => ({
  adminLaneOrganizationId: () => null,
  withAdminLaneHeader: (headers: Record<string, string>) => headers,
}));

function state(accessToken: string | null): RootState {
  let userAuth = userAuthReducer(undefined, { type: "test/init" });
  userAuth = userAuthReducer(userAuth, setAuthReady(true));
  if (accessToken) userAuth = userAuthReducer(userAuth, setAccessToken(accessToken));
  return {
    apiConfig: apiConfigReducer(undefined, { type: "test/init" }),
    appContext: { ...appContextReducer(undefined, { type: "test/init" }), organization_id: accessToken ? "5dc930e9-bd65-44a1-8369-af773f6e1a5b" : null },
    userAuth,
    userProfile: { ...userProfileReducer(undefined, { type: "test/init" }), fingerprintId: "fp-new" },
  } as unknown as RootState;
}

function res(status: number, json: unknown): Response {
  return { ok: status < 400, status, statusText: String(status), headers: new Headers(), json: async () => json, text: async () => JSON.stringify(json) } as Response;
}
const refusal = () => res(403, { error: "guest_challenge_failed", message: "Confirm you're human, then try again." });

describe("a new visitor refused for the human check", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    mockTokens.length = 0;
    mockFreshAsks.length = 0;
    clearCapturedErrors();
  });

  it("is retried once after a fresh mint and succeeds, carrying no token itself", async () => {
    mockTokens.push(true);
    const fetchMock = jest.fn().mockResolvedValueOnce(refusal()).mockResolvedValueOnce(res(200, { ok: true }));
    global.fetch = fetchMock;
    const result = await callApi({ path: "/health", method: "GET", _testOverrides: { forceBaseUrl: "https://forced.test" } })(jest.fn(), () => state(null), undefined);
    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(second["X-Turnstile-Token"]).toBeUndefined();
    expect(second["X-Fingerprint-ID"]).toBe("fp-new");
    expect(mockFreshAsks).toEqual([{ fresh: true }]);
  });

  it("a second refusal is returned, never looped", async () => {
    mockTokens.push(true);
    const fetchMock = jest.fn().mockResolvedValue(refusal());
    global.fetch = fetchMock;
    const result = await callApi({ path: "/health", method: "GET", _testOverrides: { forceBaseUrl: "https://forced.test" } })(jest.fn(), () => state(null), undefined);
    expect(result.error?.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a failed fresh mint is not retried (no repeated waits)", async () => {
    mockTokens.push(false);
    const fetchMock = jest.fn().mockResolvedValue(refusal());
    global.fetch = fetchMock;
    const result = await callApi({ path: "/health", method: "GET", _testOverrides: { forceBaseUrl: "https://forced.test" } })(jest.fn(), () => state(null), undefined);
    expect(result.error?.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a signed-in 403 is never retried", async () => {
    mockTokens.push(true);
    const fetchMock = jest.fn().mockResolvedValue(refusal());
    global.fetch = fetchMock;
    await callApi({ path: "/health", method: "GET", _testOverrides: { forceBaseUrl: "https://forced.test" } })(jest.fn(), () => state("jwt"), undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockFreshAsks).toEqual([]);
  });
});
