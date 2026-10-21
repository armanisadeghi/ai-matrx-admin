/** @jest-environment node */
/**
 * A signed-out visitor running a compare as their GUEST (features/comparison/public/GuestCompare.tsx) acts
 * in the guest workspace with the guest's own token: registerGuestWorkspaceBearer. The main session always
 * wins, and an unregistered workspace never borrows a guest's token.
 */

let mainToken: string | null = null;

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: mainToken ? { access_token: mainToken } : null },
        error: null,
      })),
    },
  },
}));
jest.mock("@/lib/services/fingerprint-service", () => ({ getCachedFingerprint: () => "visitorfingerprint0001" }));
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

import { buildHeaders, registerGuestWorkspaceBearer } from "@/lib/python-client";

const GUEST_ORG = "55040fb9-0812-47e7-9a1b-19c9ed51c300";
const OTHER_ORG = "39c38960-d30c-4840-b0c1-c9960de95582";

describe("guest workspace bearer", () => {
  let unregister: (() => void) | null = null;
  beforeEach(() => {
    mainToken = null;
    unregister = registerGuestWorkspaceBearer(GUEST_ORG, async () => "guest-token");
  });
  afterEach(() => unregister?.());

  it("a signed-out request naming the guest workspace carries the guest's bearer and that workspace", async () => {
    const { headers } = await buildHeaders({ organizationId: GUEST_ORG }, true);
    expect(headers.Authorization).toBe("Bearer guest-token");
    expect(headers["X-Organization-Id"]).toBe(GUEST_ORG);
  });

  it("the main session always wins over a registered guest", async () => {
    mainToken = "main-token";
    const { headers } = await buildHeaders({ organizationId: GUEST_ORG }, true);
    expect(headers.Authorization).toBe("Bearer main-token");
  });

  it("another workspace never borrows the guest's token", async () => {
    const { headers } = await buildHeaders({ organizationId: OTHER_ORG }, true);
    expect(headers.Authorization).toBeUndefined();
  });

  it("after unregister the guest's token is gone", async () => {
    unregister?.();
    unregister = null;
    const { headers } = await buildHeaders({ organizationId: GUEST_ORG }, true);
    expect(headers.Authorization).toBeUndefined();
  });
});
