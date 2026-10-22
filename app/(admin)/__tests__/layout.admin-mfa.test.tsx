/**
 * The admin portal's front door (manage.aimatrx.com) under administrator MFA.
 * Knob off: unchanged. Knob on: an aal1 admin is sent to the verify page with
 * their destination kept — never a dead page; aal2 renders; a member is sent
 * away exactly as before without the verdict being read.
 */
import type { ReactNode } from "react";
import AdminLayout from "../layout";
import { getServerAuth } from "@/utils/supabase/getServerAuth";
import { getAdminStatus } from "@/utils/supabase/userSessionData";
import { readAdminMfaVerdict } from "@/utils/auth/adminMfa";

jest.mock("server-only", () => ({}));
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => new Map([["x-pathname", "/administration/users"], ["x-search-params", "?tab=admins"]])),
}));
jest.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
jest.mock("@/utils/supabase/getServerAuth", () => ({ getServerAuth: jest.fn() }));
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) },
  })),
}));
jest.mock("@/utils/supabase/userSessionData", () => ({ getAdminStatus: jest.fn() }));
jest.mock("@/utils/auth/adminMfa", () => ({
  ...jest.requireActual("@/utils/auth/adminMfa"),
  readAdminMfaVerdict: jest.fn(),
}));
jest.mock("@/features/shell/utils/server-cookies", () => ({ readSidebarExpandedCookie: jest.fn(async () => true) }));
jest.mock("@/components/loaders/NavigationLoader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/chat/agents/addressing/agentAddress", () => ({ userShellPathForSystemAgentPath: () => null }));
jest.mock("@/features/shell/components/AppShell", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

const auth = jest.mocked(getServerAuth);
const status = jest.mocked(getAdminStatus);
const verdict = jest.mocked(readAdminMfaVerdict);

async function outcome(): Promise<string> {
  try {
    await AdminLayout({ children: "the page" });
    return "RENDERED";
  } catch (error) {
    return (error as Error).message;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin-1" }, isAuthenticated: true, authUnavailable: false } as never);
  status.mockResolvedValue({ isAdmin: true, level: "super_admin" });
});

describe("(admin) layout — administrator MFA", () => {
  it("knob off renders as before", async () => {
    verdict.mockResolvedValue({ state: "not_required" });
    await expect(outcome()).resolves.toBe("RENDERED");
  });
  it("knob on + aal1 goes to the verify page, keeping the destination", async () => {
    verdict.mockResolvedValue({ state: "challenge", reason: "insufficient_aal" });
    await expect(outcome()).resolves.toBe(
      `REDIRECT:/auth/admin-verify?redirectTo=${encodeURIComponent("/administration/users?tab=admins")}`,
    );
  });
  it("knob on + aal2 renders", async () => {
    verdict.mockResolvedValue({ state: "admitted" });
    await expect(outcome()).resolves.toBe("RENDERED");
  });
  it("an unreadable verdict holds with a retry line instead of granting or bouncing", async () => {
    verdict.mockResolvedValue({ state: "unavailable" });
    const element = await AdminLayout({ children: "the page" });
    expect(JSON.stringify(element)).toContain("Verification check unavailable");
    expect(JSON.stringify(element)).not.toContain("the page");
  });
  it("a member is sent to the dashboard without reading the verdict", async () => {
    status.mockResolvedValue({ isAdmin: false, level: null });
    await expect(outcome()).resolves.toBe("REDIRECT:/dashboard");
    expect(verdict).not.toHaveBeenCalled();
  });
});
