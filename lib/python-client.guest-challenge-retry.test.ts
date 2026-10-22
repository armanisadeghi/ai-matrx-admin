/** @jest-environment jsdom */
/**
 * Review I6 (2026-10-22): the /search path (useBackendApi → requestRaw) had no retry on 403
 * guest_challenge_failed — only callApi and the chat seams did. A new signed-out visitor refused for the
 * human check is now minted once more (ensureGuestIdentity fresh) and the request retried ONCE; a failed
 * mint or a signed-in 403 is never retried. A signed-out write mints the visitor first; a read never waits.
 */

jest.mock("@/utils/supabase/client", () => ({
  supabase: { auth: { getSession: jest.fn(async () => ({ data: { session: null }, error: null })) } },
}));
jest.mock("@/lib/services/fingerprint-service", () => ({
  getCachedFingerprint: () => "visitor-fp-1",
  getFingerprint: async () => "visitor-fp-1",
}));
jest.mock("@/lib/api/log-api-target", () => ({ logApiTarget: jest.fn() }));
jest.mock("@/lib/diagnostics/capturePythonClientError", () => ({
  capturePythonClientError: jest.fn(),
  relationPathFromUrl: (path: string) => path.split("?")[0],
}));
const fakeStore = () => ({
  getState: () => ({ appContext: { organization_id: null, orgBootstrapResolved: true } }),
  subscribe: () => () => undefined,
});
jest.mock("@/lib/redux/store-singleton", () => ({ getStore: () => fakeStore(), getStoreSingleton: () => fakeStore() }));
const mockEnsure = jest.fn(async (_o?: { fresh?: boolean }) => true);
jest.mock("@/lib/guest/turnstile", () => ({
  ...jest.requireActual("@/lib/guest/turnstile"),
  ensureGuestIdentity: (o?: { fresh?: boolean }) => mockEnsure(o),
}));

import { requestRaw } from "@/lib/python-client";

const refusal = () =>
  new Response(JSON.stringify({ error: "guest_challenge_failed", message: "Confirm you're human" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
const ok = () => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });

describe("requestRaw and a new visitor's human check", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    mockEnsure.mockReset();
    mockEnsure.mockImplementation(async () => true);
  });

  const search = () =>
    requestRaw(
      "/search-kinds/search",
      { method: "POST", body: JSON.stringify({ query: "q" }) },
      { baseUrlOverride: "https://server.test", allowHttpError: true },
    );

  it("mints first, then retries a refused search once after a fresh mint", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(refusal()).mockResolvedValueOnce(ok());
    global.fetch = fetchMock;
    const res = await search();
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockEnsure.mock.calls.map((c) => c[0])).toEqual([undefined, { fresh: true }]);
  });

  it("a failed fresh mint is not retried, and a second refusal is never looped", async () => {
    mockEnsure.mockImplementation(async (o?: { fresh?: boolean }) => !o?.fresh);
    let fetchMock = jest.fn().mockResolvedValue(refusal());
    global.fetch = fetchMock;
    expect((await search()).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    mockEnsure.mockImplementation(async () => true);
    fetchMock = jest.fn().mockResolvedValue(refusal());
    global.fetch = fetchMock;
    expect((await search()).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a read never mints or waits", async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok());
    global.fetch = fetchMock;
    await requestRaw("/health", { method: "GET" }, { baseUrlOverride: "https://server.test" });
    expect(mockEnsure).not.toHaveBeenCalled();
  });
});
