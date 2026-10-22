/** @jest-environment node */
/**
 * server-api.test.ts — characterization of the website's one `@ai-matrx/api`
 * client against what lib/python-client.ts sends today: the credentials, the
 * organization gate, the guest fingerprint, request ids, the admin-lane and AI
 * test mode headers, the base URL per deployment, and the error object callers
 * catch (`BackendApiError`, with its message, status and root `details`).
 */

import type { OperationDescriptor } from "@ai-matrx/api";

let accessToken: string | null = "jwt-1";
let fingerprintId: string | null = null;
let selectedOrganizationId: string | null = null;
let adminLaneOrg: string | null = null;
let cachedFingerprint: string | null = null;
let refreshedToken = "jwt-2";
const refreshSession = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: { auth: { refreshSession: (...a: unknown[]) => refreshSession(...a) } },
}));
jest.mock("@/lib/api/call-api", () => ({ waitForAuthReady: async () => undefined }));
jest.mock("@/lib/api/log-api-target", () => ({ logApiTarget: jest.fn() }));
jest.mock("@/lib/api/ai-test-mode", () => ({
  aiTestModeHeaders: () => ({}),
}));
jest.mock("@/lib/api/admin-lane", () => ({
  adminLaneOrganizationId: () => adminLaneOrg,
  adminLaneHeadersFor: (org: string | null | undefined) =>
    adminLaneOrg && org ? { "x-matrx-admin-lane": "1" } : {},
}));
jest.mock("@/lib/api/organization-admission", () => ({
  waitForOrganizationAdmission: jest.fn(async () => "ready"),
  peekSelectedOrganizationId: () => selectedOrganizationId,
}));
jest.mock("@/lib/api/resolve-service-url", () => ({
  resolveServiceBaseUrl: (service: string) => `https://${service}.test`,
}));
jest.mock("@/lib/python-client", () => ({
  resolveBaseUrl: () => "https://aidream.test",
  resolveFilesBaseUrl: () => "https://files.test",
}));
jest.mock("@/lib/services/fingerprint-service", () => ({
  getCachedFingerprint: () => cachedFingerprint,
}));
const ensureGuestIdentity = jest.fn(async (_o?: { fresh?: boolean }) => true);
jest.mock("@/lib/guest/turnstile", () => ({
  ...jest.requireActual("@/lib/guest/turnstile"),
  ensureGuestIdentity: (o?: { fresh?: boolean }) => ensureGuestIdentity(o),
}));
jest.mock("@/lib/diagnostics/capturePythonClientError", () => ({
  capturePythonClientError: jest.fn(),
  relationPathFromUrl: (path: string) => path.split("?")[0],
}));
const noticeUsageRefusal = jest.fn();
jest.mock("@/features/entitlements/usage-gate/usageGate", () => ({
  noticeUsageRefusal: (...a: unknown[]) => noticeUsageRefusal(...a),
}));
jest.mock("@/lib/organizations/organizationRefusal", () => ({
  noticeNotAMemberRefusal: jest.fn(),
}));
jest.mock("@/lib/redux/store-singleton", () => ({
  getStore: () => ({ getState: () => ({}), dispatch: jest.fn() }),
  getStoreSingleton: () => ({ getState: () => ({}), dispatch: jest.fn() }),
}));
jest.mock("@/lib/redux/slices/userSlice", () => ({
  selectAccessToken: () => accessToken,
  selectFingerprintId: () => fingerprintId,
}));

import { BackendApiError, OrganizationContextError } from "@ai-matrx/api";
import { capturePythonClientError } from "@/lib/diagnostics/capturePythonClientError";
import { serverApi } from "@/lib/api/server-api";

const WRITE: OperationDescriptor = {
  m: "POST",
  p: "/things/{id}",
  d: "aidream",
  a: "user",
  o: "required",
  n: "test.write",
};
const READ: OperationDescriptor = { ...WRITE, m: "GET", o: "optional", n: "test.read" };
const FILES_READ: OperationDescriptor = { ...READ, d: "files", p: "/files/{id}", n: "test.files" };
const ORG = "5dc930e9-bd65-44a1-8369-af773f6e1a5b";
const OTHER_ORG = "39c38960-d30c-4840-b0c1-c9960de95582";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: jest.Mock;
function sent(index = 0): { url: string; headers: Record<string, string>; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[index] as [string | URL, RequestInit];
  const raw = (init.headers ?? {}) as Record<string, string> | Headers;
  const headers: Record<string, string> = {};
  if (raw instanceof Headers) raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
  else for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = v;
  return { url: String(url), headers, init };
}

beforeEach(() => {
  jest.clearAllMocks();
  accessToken = "jwt-1";
  fingerprintId = null;
  selectedOrganizationId = ORG;
  adminLaneOrg = null;
  cachedFingerprint = null;
  fetchMock = jest.fn(async () => jsonResponse({ ok: true }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("server-api request identity (parity with python-client buildHeaders)", () => {
  it("a signed-in write carries Bearer, the active organization, a request id and JSON accept", async () => {
    const result = await serverApi.call<{ ok: boolean }>(WRITE, { path: { id: "a b" }, body: { x: 1 } });
    expect(result).toEqual({ ok: true });
    const { url, headers, init } = sent();
    expect(url).toBe("https://aidream.test/things/a%20b");
    expect(headers.authorization).toBe("Bearer jwt-1");
    expect(headers["x-organization-id"]).toBe(ORG);
    expect(headers["x-request-id"]).toMatch(/[0-9a-f-]{8,}/);
    expect(headers.accept).toBe("application/json");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ x: 1 });
  });

  it("every call mints its own request id", async () => {
    await serverApi.call(READ, { path: { id: "1" } });
    await serverApi.call(READ, { path: { id: "1" } });
    expect(sent(0).headers["x-request-id"]).not.toBe(sent(1).headers["x-request-id"]);
  });

  it("the guest fingerprint rides every call, signed in or not", async () => {
    cachedFingerprint = "fp-9";
    await serverApi.call(READ, { path: { id: "1" } });
    expect(sent().headers["x-guest-fingerprint"]).toBe("fp-9");
  });

  it("a guest sends the fingerprint credential and NO organization", async () => {
    accessToken = null;
    fingerprintId = "fp-9";
    cachedFingerprint = "fp-9";
    await serverApi.call(READ, { path: { id: "1" } });
    const { headers } = sent();
    expect(headers.authorization).toBeUndefined();
    expect(headers["x-fingerprint-id"]).toBe("fp-9");
    expect(headers["x-organization-id"]).toBeUndefined();
  });

  it("an explicit organization wins over the selected one", async () => {
    await serverApi.call(WRITE, { path: { id: "1" } }, { organizationId: OTHER_ORG });
    expect(sent().headers["x-organization-id"]).toBe(OTHER_ORG);
  });

  it("a read with no organization selected is SENT naming none", async () => {
    selectedOrganizationId = null;
    await serverApi.call(READ, { path: { id: "1" } });
    expect(sent().headers["x-organization-id"]).toBeUndefined();
  });

  it("a write with no organization is refused BEFORE the wire", async () => {
    selectedOrganizationId = null;
    await expect(serverApi.call(WRITE, { path: { id: "1" } })).rejects.toBeInstanceOf(
      OrganizationContextError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the admin seat binds its organization and adds the admin-lane header", async () => {
    adminLaneOrg = OTHER_ORG;
    await serverApi.call(WRITE, { path: { id: "1" } });
    const { headers } = sent();
    expect(headers["x-organization-id"]).toBe(OTHER_ORG);
    expect(headers["x-matrx-admin-lane"]).toBe("1");
  });

  it("the admin-lane header is absent off the admin seat", async () => {
    await serverApi.call(WRITE, { path: { id: "1" } });
    expect(sent().headers["x-matrx-admin-lane"]).toBeUndefined();
  });

  it("a query rides the URL; empty values are dropped", async () => {
    await serverApi.call(READ, { path: { id: "1" }, query: { a: "x", b: undefined, c: ["p", "q"] } });
    expect(sent().url).toBe("https://aidream.test/things/1?a=x&c=p&c=q");
  });
});

describe("server-api base URL per deployment (the admin server toggle)", () => {
  it("files go to the files service, aidream to the active server", async () => {
    await serverApi.call(FILES_READ, { path: { id: "f1" } });
    await serverApi.call(READ, { path: { id: "1" } });
    expect(sent(0).url).toBe("https://files.test/files/f1");
    expect(sent(1).url).toBe("https://aidream.test/things/1");
  });
});

describe("server-api session handling", () => {
  it("a 401 refreshes the session once and retries with the fresh token", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    refreshSession.mockImplementation(async () => {
      accessToken = refreshedToken;
      return { data: { session: { access_token: refreshedToken } }, error: null };
    });
    await expect(serverApi.call(READ, { path: { id: "1" } })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sent(1).headers.authorization).toBe("Bearer jwt-2");
  });
});

describe("server-api signed-out visitors (parity with python-client)", () => {
  const GUEST_WRITE: OperationDescriptor = { ...WRITE, o: "optional", n: "test.guest-write" };
  beforeEach(() => {
    accessToken = null;
    fingerprintId = "fp-9";
    cachedFingerprint = "fp-9";
    selectedOrganizationId = null;
  });

  it("a signed-out write makes sure the visitor exists before the wire", async () => {
    await serverApi.call(GUEST_WRITE, { path: { id: "1" } });
    expect(ensureGuestIdentity).toHaveBeenCalledTimes(1);
  });

  it("a signed-out read never runs the human check", async () => {
    await serverApi.call(READ, { path: { id: "1" } });
    expect(ensureGuestIdentity).not.toHaveBeenCalled();
  });

  it("a 403 guest_challenge_failed runs the check fresh and retries once", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "guest_challenge_failed" }, 403))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(serverApi.call(GUEST_WRITE, { path: { id: "1" } })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(ensureGuestIdentity).toHaveBeenCalledWith({ fresh: true });
  });
});

describe("server-api guest retry never resends a consumed stream", () => {
  it("a stream-body write refused by the guest check is not sent twice", async () => {
    accessToken = null;
    fingerprintId = "fp-9";
    cachedFingerprint = "fp-9";
    selectedOrganizationId = null;
    fetchMock.mockResolvedValue(jsonResponse({ error: "guest_challenge_failed" }, 403));
    const body = new ReadableStream({ start: (c) => c.close() });
    await serverApi.call({ ...WRITE, o: "optional", n: "test.stream-write" }, { path: { id: "1" }, body } as never).catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("server-api errors (the object callers catch)", () => {
  it("a structured refusal becomes BackendApiError with the server's message, status and root details", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: "sandbox_capacity_full", message: "Full", user_message: "Stop one of your sandboxes.", occupants: ["a"], ceiling: 2 },
        409,
      ),
    );
    const error = (await serverApi.call(WRITE, { path: { id: "1" } }).catch((e) => e)) as BackendApiError;
    expect(error).toBeInstanceOf(BackendApiError);
    expect(error.status).toBe(409);
    expect(error.userMessage).toBe("Stop one of your sandboxes.");
    expect(error.details).toMatchObject({ occupants: ["a"], ceiling: 2 });
    expect(capturePythonClientError).toHaveBeenCalledTimes(1);
  });

  it("a FastAPI detail string keeps its message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Not found" }, 404));
    const error = (await serverApi.call(READ, { path: { id: "1" } }).catch((e) => e)) as BackendApiError;
    expect(error).toBeInstanceOf(BackendApiError);
    expect(error.status).toBe(404);
    expect(error.userMessage).toContain("Not found");
  });

  it("a 402 usage refusal is noticed, the request's own error unchanged", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: "usage_limit_reached" }, 402));
    const error = (await serverApi.call(WRITE, { path: { id: "1" } }).catch((e) => e)) as BackendApiError;
    expect(error.status).toBe(402);
    expect(noticeUsageRefusal).toHaveBeenCalledWith(null, { code: "usage_limit_reached" }, expect.anything(), expect.anything());
  });

  it("a request the caller canceled is not captured as an incident", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(async () => {
      controller.abort();
      throw new DOMException("aborted", "AbortError");
    });
    await expect(
      serverApi.call(READ, { path: { id: "1" } }, { signal: controller.signal }),
    ).rejects.toBeDefined();
    expect(capturePythonClientError).not.toHaveBeenCalled();
  });
});
