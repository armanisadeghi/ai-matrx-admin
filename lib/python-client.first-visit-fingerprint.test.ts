/** @jest-environment jsdom */
/**
 * A first-time signed-out visitor has no stored fingerprint when their first request goes out (the search page
 * fires on load). The request must resolve the visitor id instead of failing with "Please sign in to continue".
 */

jest.mock("@/utils/supabase/client", () => ({
  supabase: { auth: { getSession: jest.fn(async () => ({ data: { session: null }, error: null })) } },
}));
jest.mock("@/lib/services/fingerprint-service", () => ({
  getCachedFingerprint: () => null,
  getFingerprint: async () => "freshvisitor0000000000000001",
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

import { buildHeaders } from "@/lib/python-client";

describe("first visit", () => {
  it("a visitor with no stored id still sends the one the server issued", async () => {
    const { headers } = await buildHeaders({}, true);
    expect(headers["X-Guest-Fingerprint"]).toBe("freshvisitor0000000000000001");
    expect(headers.Authorization).toBeUndefined();
  });
});
