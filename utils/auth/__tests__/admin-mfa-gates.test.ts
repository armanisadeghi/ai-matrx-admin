/**
 * ADMINISTRATOR MFA GATES (READY-04). The rule: administrator power is honored
 * only from an aal2 session WHEN platform.auth / admin_mfa_required is on; with
 * the knob off every gate answers exactly as before, and a non-admin is never
 * touched (the verdict is not even read for them).
 *
 * The verdict itself is the database's platform.admin_session_state(); here it
 * is stubbed at its one seam (`readAdminMfaVerdict`) so each gate is proven to
 * consult it. Perturb any gate to skip `adminMfaAllows` and its aal1 case fails.
 */
import {
  ADMIN_MFA_REFUSAL,
  adminMfaAllows,
  adminVerifyDestination,
  parseAdminSessionState,
  readAdminMfaVerdictWith,
  type AdminMfaVerdict,
} from "@/utils/auth/adminMfa";

const mockVerdict = jest.fn<Promise<AdminMfaVerdict>, []>();
const mockReadAdminStatus = jest.fn();
const mockLaneOpen = jest.fn<boolean, []>();

jest.mock("server-only", () => ({}));
jest.mock("@/utils/auth/adminMfa", () => ({
  ...jest.requireActual("@/utils/auth/adminMfa"),
  readAdminMfaVerdict: () => mockVerdict(),
}));
jest.mock("@ai-matrx/auth/admin", () => ({ readAdminStatus: (...args: unknown[]) => mockReadAdminStatus(...args) }));
jest.mock("next/headers", () => ({ headers: jest.fn(async () => new Map()) }));
jest.mock("@/utils/supabase/adminLane", () => ({
  ADMIN_LANE_REFUSAL: "Admin lane required",
  adminLaneOpenForHeaders: () => mockLaneOpen(),
}));
jest.mock("@/utils/supabase/server", () => ({ createClient: jest.fn(async () => ({})) }));
jest.mock("@/utils/supabase/claimsUser", () => ({
  getClaimsUser: jest.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
}));

// Imported after the mocks so they bind to the stubs.
import { checkIsSuperAdmin, checkIsUserAdmin } from "@/utils/supabase/userSessionData";
import { requireAdmin, requireSuperAdmin } from "@/utils/auth/adminUtils";
import { hasAdminFeature, hasAdminPower } from "@/utils/auth/adminLaneServer";

const client = {} as never;
const OFF: AdminMfaVerdict = { state: "not_required" };
const AAL1: AdminMfaVerdict = { state: "challenge", reason: "insufficient_aal" };
const AAL2: AdminMfaVerdict = { state: "admitted" };
const DOWN: AdminMfaVerdict = { state: "unavailable" };

function asSuperAdmin() { mockReadAdminStatus.mockResolvedValue({ state: "admin", level: "super_admin" }); }
function asDeveloper() { mockReadAdminStatus.mockResolvedValue({ state: "admin", level: "developer" }); }
function asMember() { mockReadAdminStatus.mockResolvedValue({ state: "not_admin" }); }

beforeEach(() => {
  jest.clearAllMocks();
  mockLaneOpen.mockReturnValue(true);
});

describe("the database verdict", () => {
  it("knob off is not_required, whatever the session", () => {
    expect(parseAdminSessionState({ mfa_required: false, admitted: false, reason: "insufficient_aal" })).toEqual(OFF);
  });
  it("knob on admits an aal2 session and challenges an aal1 one", () => {
    expect(parseAdminSessionState({ mfa_required: true, admitted: true, reason: "admitted" })).toEqual(AAL2);
    expect(parseAdminSessionState({ mfa_required: true, admitted: false, reason: "insufficient_aal" })).toEqual(AAL1);
  });
  it("a malformed or failed read is unavailable, which never allows power", async () => {
    expect(parseAdminSessionState(null)).toEqual(DOWN);
    expect(parseAdminSessionState({ mfa_required: "yes", admitted: true })).toEqual(DOWN);
    const failing = { schema: () => ({ rpc: async () => ({ data: null, error: { message: "boom" } }) }) };
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(readAdminMfaVerdictWith(failing as never)).resolves.toEqual(DOWN);
    expect([OFF, AAL2, AAL1, DOWN].map(adminMfaAllows)).toEqual([true, true, false, false]);
  });
  it("asks platform.admin_session_state as the signed-in client", async () => {
    const rpc = jest.fn(async () => ({ data: { mfa_required: true, admitted: true }, error: null }));
    const schema = jest.fn(() => ({ rpc }));
    await expect(readAdminMfaVerdictWith({ schema } as never)).resolves.toEqual(AAL2);
    expect(schema).toHaveBeenCalledWith("platform");
    expect(rpc).toHaveBeenCalledWith("admin_session_state");
  });
});

describe("checkIsSuperAdmin / checkIsUserAdmin", () => {
  it("knob off: unchanged — a super admin passes on any session", async () => {
    asSuperAdmin(); mockVerdict.mockResolvedValue(OFF);
    await expect(checkIsSuperAdmin(client, "user-1")).resolves.toBe(true);
    await expect(checkIsUserAdmin(client, "user-1")).resolves.toBe(true);
  });
  it("knob on: aal1 is refused, aal2 is accepted, an unreadable verdict is refused", async () => {
    asSuperAdmin();
    mockVerdict.mockResolvedValue(AAL1);
    await expect(checkIsSuperAdmin(client, "user-1")).resolves.toBe(false);
    await expect(checkIsUserAdmin(client, "user-1")).resolves.toBe(false);
    mockVerdict.mockResolvedValue(AAL2);
    await expect(checkIsSuperAdmin(client, "user-1")).resolves.toBe(true);
    mockVerdict.mockResolvedValue(DOWN);
    await expect(checkIsSuperAdmin(client, "user-1")).resolves.toBe(false);
  });
  it("a non-admin is unaffected and never reads the verdict", async () => {
    asMember(); mockVerdict.mockResolvedValue(AAL2);
    await expect(checkIsSuperAdmin(client, "user-1")).resolves.toBe(false);
    await expect(checkIsUserAdmin(client, "user-1")).resolves.toBe(false);
    expect(mockVerdict).not.toHaveBeenCalled();
  });
});

describe("requireSuperAdmin / requireAdmin", () => {
  it("knob off: unchanged", async () => {
    asSuperAdmin(); mockVerdict.mockResolvedValue(OFF);
    await expect(requireSuperAdmin()).resolves.toBe("user-1");
    await expect(requireAdmin()).resolves.toBe("user-1");
  });
  it("knob on: aal1 throws the 403 sentence, aal2 passes", async () => {
    asSuperAdmin(); mockVerdict.mockResolvedValue(AAL1);
    await expect(requireSuperAdmin()).rejects.toThrow(ADMIN_MFA_REFUSAL);
    await expect(requireAdmin()).rejects.toThrow(ADMIN_MFA_REFUSAL);
    expect(ADMIN_MFA_REFUSAL.startsWith("Forbidden")).toBe(true);
    mockVerdict.mockResolvedValue(AAL2);
    await expect(requireSuperAdmin()).resolves.toBe("user-1");
  });
  it("a non-admin still gets the plain level refusal, not the MFA one", async () => {
    asMember(); mockVerdict.mockResolvedValue(AAL1);
    await expect(requireSuperAdmin()).rejects.toThrow("Forbidden: Super Admin required");
    asDeveloper();
    await expect(requireSuperAdmin()).rejects.toThrow("Forbidden: Super Admin required");
    expect(mockVerdict).not.toHaveBeenCalled();
  });
});

describe("hasAdminPower / hasAdminFeature", () => {
  it("knob off: unchanged", async () => {
    asSuperAdmin(); mockVerdict.mockResolvedValue(OFF);
    await expect(hasAdminPower(client, "user-1")).resolves.toBe(true);
  });
  it("knob on: aal1 has no power, aal2 has it", async () => {
    asSuperAdmin(); mockVerdict.mockResolvedValue(AAL1);
    await expect(hasAdminPower(client, "user-1")).resolves.toBe(false);
    await expect(hasAdminPower(client, "user-1", "any")).resolves.toBe(false);
    mockVerdict.mockResolvedValue(AAL2);
    await expect(hasAdminPower(client, "user-1")).resolves.toBe(true);
  });
  it("outside the admin lane nothing changes and the verdict is not read", async () => {
    asSuperAdmin(); mockLaneOpen.mockReturnValue(false); mockVerdict.mockResolvedValue(AAL2);
    await expect(hasAdminPower(client, "user-1")).resolves.toBe(false);
    expect(mockVerdict).not.toHaveBeenCalled();
  });
  it("a registered admin feature follows the same rule", async () => {
    asSuperAdmin();
    const { ADMIN_FEATURES_ON_USER_PAGES } = jest.requireActual("@/utils/auth/adminFeaturesOnUserPages") as {
      ADMIN_FEATURES_ON_USER_PAGES?: Record<string, unknown>;
    };
    const feature = Object.keys(ADMIN_FEATURES_ON_USER_PAGES ?? {})[0];
    if (!feature) return;
    mockVerdict.mockResolvedValue(AAL1);
    await expect(hasAdminFeature(client, "user-1", feature as never)).resolves.toBe(false);
    mockVerdict.mockResolvedValue(OFF);
    await expect(hasAdminFeature(client, "user-1", feature as never)).resolves.toBe(true);
  });
});

describe("the verify page's destination", () => {
  it("keeps same-site paths, aimatrx.com hosts and the admin dashboard origin", () => {
    expect(adminVerifyDestination("/administration/users?x=1")).toBe("/administration/users?x=1");
    expect(adminVerifyDestination("https://manage.aimatrx.com/administration")).toBe("https://manage.aimatrx.com/administration");
    expect(adminVerifyDestination("https://admin.app.matrxserver.com/users")).toBe("https://admin.app.matrxserver.com/users");
  });
  it("refuses anything else", () => {
    for (const bad of ["https://evil.com/", "//evil.com", "https://admin.app.matrxserver.com.evil.com/", "javascript:alert(1)", undefined]) {
      expect(adminVerifyDestination(bad)).toBe("/administration");
    }
  });
});
