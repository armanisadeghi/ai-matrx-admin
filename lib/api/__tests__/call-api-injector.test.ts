// Characterization of what callApi INJECTS — the facts this app supplies to the
// shared @ai-matrx/api pipeline: the admin's server override, per-call test
// overrides, the bearer / guest credential, and the organization binding
// (including the admin seat). The transport itself is owned by the package.
import { callApi } from "../call-api";
import apiConfigReducer, {
  setActiveServer,
  setCustomUrl,
} from "@/lib/redux/slices/apiConfigSlice";
import appContextReducer from "@/lib/redux/slices/appContextSlice";
import userAuthReducer, {
  setAccessToken,
  setAuthReady,
} from "@/lib/redux/slices/userAuthSlice";
import userProfileReducer from "@/lib/redux/slices/userProfileSlice";
import type { RootState } from "@/lib/redux/store";
import { clearCapturedErrors } from "@/lib/diagnostics/errorCaptureStore";

const ORGANIZATION_ID = "5dc930e9-bd65-44a1-8369-af773f6e1a5b";
const ADMIN_ORGANIZATION_ID = "39c38960-d30c-4840-b0c1-c9960de95582";

jest.mock("@/lib/organizations/ensureOrgId", () => ({
  ensureOrgId: async () => "5dc930e9-bd65-44a1-8369-af773f6e1a5b",
}));

const mockAdminLane: { org: string | null } = { org: null };
jest.mock("@/lib/api/admin-lane", () => ({
  adminLaneOrganizationId: () => mockAdminLane.org,
  withAdminLaneHeader: (headers: Record<string, string>) => headers,
}));

interface StateOptions {
  organizationId?: string | null;
  accessToken?: string | null;
  fingerprintId?: string | null;
  customServerUrl?: string;
}

function requestState(options: StateOptions = {}): RootState {
  const { organizationId = ORGANIZATION_ID, accessToken = null } = options;
  let apiConfig = apiConfigReducer(undefined, { type: "test/init" });
  if (options.customServerUrl) {
    apiConfig = apiConfigReducer(apiConfig, setActiveServer("custom"));
    apiConfig = apiConfigReducer(apiConfig, setCustomUrl(options.customServerUrl));
  }
  let userAuth = userAuthReducer(undefined, { type: "test/init" });
  userAuth = userAuthReducer(userAuth, setAuthReady(true));
  if (accessToken) userAuth = userAuthReducer(userAuth, setAccessToken(accessToken));
  const userProfile = {
    ...userProfileReducer(undefined, { type: "test/init" }),
    ...(options.fingerprintId ? { fingerprintId: options.fingerprintId } : {}),
  };
  return {
    apiConfig,
    appContext: {
      ...appContextReducer(undefined, { type: "test/init" }),
      organization_id: organizationId,
    },
    userAuth,
    userProfile,
  } as unknown as RootState;
}

function okResponse(json: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    json: async () => json,
  } as Response;
}

function sentRequest(fetchMock: jest.Mock): {
  url: string;
  headers: Record<string, string>;
  body: unknown;
} {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url: String(url),
    headers: (init.headers ?? {}) as Record<string, string>,
    body: init.body ? JSON.parse(String(init.body)) : undefined,
  };
}

describe("callApi injector inputs", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    mockAdminLane.org = null;
    fetchMock = jest.fn().mockResolvedValue(okResponse({ status: "healthy" }));
    global.fetch = fetchMock;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    clearCapturedErrors();
  });

  it("sends to the server the admin selected (custom URL override)", async () => {
    const state = requestState({ customServerUrl: "https://admin-override.test" });
    const result = await callApi({ path: "/health", method: "GET" })(
      jest.fn(),
      () => state,
      undefined,
    );
    expect(result.error).toBeUndefined();
    expect(sentRequest(fetchMock).url.startsWith("https://admin-override.test/")).toBe(true);
  });

  it("forceBaseUrl wins over the admin's selected server", async () => {
    const state = requestState({ customServerUrl: "https://admin-override.test" });
    await callApi({
      path: "/health",
      method: "GET",
      _testOverrides: { forceBaseUrl: "https://forced.test" },
    })(jest.fn(), () => state, undefined);
    expect(sentRequest(fetchMock).url.startsWith("https://forced.test/")).toBe(true);
  });

  it("sends the bearer token and merges additionalHeaders over the auth headers", async () => {
    const state = requestState({ accessToken: "jwt-test" });
    await callApi({
      path: "/health",
      method: "GET",
      _testOverrides: {
        forceBaseUrl: "https://forced.test",
        additionalHeaders: { "X-Test-Run": "characterization" },
      },
    })(jest.fn(), () => state, undefined);
    const { headers } = sentRequest(fetchMock);
    expect(headers.Authorization).toBe("Bearer jwt-test");
    expect(headers["X-Test-Run"]).toBe("characterization");
    expect(headers["X-Organization-Id"]).toBe(ORGANIZATION_ID);
  });

  it("sends the fingerprint (and no organization) for a guest", async () => {
    const state = requestState({ organizationId: null, fingerprintId: "fp-guest-test" });
    await callApi({
      path: "/health",
      method: "GET",
      _testOverrides: { forceBaseUrl: "https://forced.test" },
    })(jest.fn(), () => state, undefined);
    const { headers } = sentRequest(fetchMock);
    expect(headers["X-Fingerprint-ID"]).toBe("fp-guest-test");
    expect(headers.Authorization).toBeUndefined();
    expect(headers["X-Organization-Id"]).toBeUndefined();
  });

  it("mockResponse returns without touching the network", async () => {
    const state = requestState();
    const result = await callApi({
      path: "/health",
      method: "GET",
      _testOverrides: { forceBaseUrl: "https://forced.test", mockResponse: { mocked: true } },
    })(jest.fn(), () => state, undefined);
    expect(result).toEqual({ data: { mocked: true } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("injects the active organization into the body and the middleware header", async () => {
    const state = requestState();
    await callApi({
      path: "/ai/agents/{agent_id}",
      method: "POST",
      pathParams: { agent_id: "agent-test" },
      body: { user_input: "hello" },
      _testOverrides: { forceBaseUrl: "https://forced.test" },
    })(jest.fn(), () => state, undefined);
    const { headers, body, url } = sentRequest(fetchMock);
    expect(headers["X-Organization-Id"]).toBe(ORGANIZATION_ID);
    expect(body).toMatchObject({ organization_id: ORGANIZATION_ID, user_input: "hello" });
    expect(url).toContain("agent-test");
  });

  it("an explicit scopeOverrides organization wins over the active one", async () => {
    const state = requestState();
    await callApi({
      path: "/health",
      method: "GET",
      scopeOverrides: { organization_id: ADMIN_ORGANIZATION_ID },
      _testOverrides: { forceBaseUrl: "https://forced.test" },
    })(jest.fn(), () => state, undefined);
    expect(sentRequest(fetchMock).headers["X-Organization-Id"]).toBe(ADMIN_ORGANIZATION_ID);
  });

  it("the admin seat binds its organization even when none is selected", async () => {
    mockAdminLane.org = ADMIN_ORGANIZATION_ID;
    const state = requestState({ organizationId: null });
    await callApi({
      path: "/ai/agents/{agent_id}",
      method: "POST",
      pathParams: { agent_id: "agent-test" },
      body: { user_input: "hello" },
      _testOverrides: { forceBaseUrl: "https://forced.test" },
    })(jest.fn(), () => state, undefined);
    const { headers, body } = sentRequest(fetchMock);
    expect(headers["X-Organization-Id"]).toBe(ADMIN_ORGANIZATION_ID);
    expect(body).toMatchObject({ organization_id: ADMIN_ORGANIZATION_ID });
  });
});
