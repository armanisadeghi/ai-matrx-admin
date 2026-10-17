// A run lookup names the subject's organization only when the caller belongs to it: the server refuses any
// other with `organization_forbidden` (a captured red error on every brand page a viewer opens, retried).
const mockCallApi = jest.fn((arg: unknown) => ({ __callApi: arg }));
jest.mock("@/lib/api/call-api", () => ({ callApi: (arg: unknown) => mockCallApi(arg) }));

import { lookupOrganizationScope, lookupSystemRun } from "../systemRuns";
import type { AppDispatch } from "@/lib/redux/store";

const BRAND_ORG = "f9cb3e35-2a65-4f2a-8525-088d6551071c";
const OTHER_ORG = "8cb71c8b-5b49-4563-a5fe-d77ff600f8ee";

function fakeDispatch(memberOrgIds: string[]): AppDispatch {
  const state = { scopesTree: { organizationIds: memberOrgIds } };
  return ((action: unknown) => {
    if (typeof action === "function") return (action as (d: unknown, g: () => unknown) => unknown)(fakeDispatch, () => state);
    return Promise.resolve({ data: { run: null }, error: null });
  }) as unknown as AppDispatch;
}

describe("lookupOrganizationScope", () => {
  it("keeps the subject's organization for a member", () => {
    expect(lookupOrganizationScope(BRAND_ORG, [OTHER_ORG, BRAND_ORG])).toBe(BRAND_ORG);
  });
  it("drops it for a viewer outside it, and when none is named", () => {
    expect(lookupOrganizationScope(BRAND_ORG, [OTHER_ORG])).toBeUndefined();
    expect(lookupOrganizationScope(undefined, [OTHER_ORG])).toBeUndefined();
  });
  it("keeps it while the organization list is still loading", () => {
    expect(lookupOrganizationScope(BRAND_ORG, [])).toBe(BRAND_ORG);
  });
});

describe("lookupSystemRun", () => {
  beforeEach(() => mockCallApi.mockClear());
  it("sends the brand's organization for a member", async () => {
    await lookupSystemRun(fakeDispatch([BRAND_ORG]), "smart_add_brand_setup", "brand:x", BRAND_ORG, "failed");
    expect(mockCallApi.mock.calls[0][0]).toMatchObject({ scopeOverrides: { organization_id: BRAND_ORG } });
  });
  it("sends no foreign organization for a non-member", async () => {
    await lookupSystemRun(fakeDispatch([OTHER_ORG]), "smart_add_brand_setup", "brand:x", BRAND_ORG, "failed");
    expect(mockCallApi.mock.calls[0][0]).not.toHaveProperty("scopeOverrides");
  });
});
