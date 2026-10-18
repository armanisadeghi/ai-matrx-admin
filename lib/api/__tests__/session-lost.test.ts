/** @jest-environment jsdom */
/**
 * A server that no longer knows the signed-in session (401 auth_required) must not leave the page
 * looking signed in: one refresh, then /login carrying the page. Guests and other 401s are untouched.
 */

let accessToken: string | null = "jwt";
const refreshSession = jest.fn();
const signOut = jest.fn(async () => ({ error: null }));
const assign = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: { auth: { refreshSession: (...a: unknown[]) => refreshSession(...a), signOut: (...a: unknown[]) => signOut(...(a as [])) } },
}));
jest.mock("@/lib/redux/store-singleton", () => ({ getStore: () => ({ getState: () => ({}) }) }));
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectAccessToken: () => accessToken }));

import { noteServerSessionRefusal, resetSessionLostForTests, isServerSessionRefusal } from "../session-lost";

const refusal = { status: 401, code: "auth_required", message: "Authentication required" };

beforeEach(() => {
  accessToken = "jwt";
  refreshSession.mockReset();
  signOut.mockClear();
  assign.mockClear();
  resetSessionLostForTests(assign);
  window.history.pushState({}, "", "/agents/new/studio?x=1");
});

it("recognises only a 401 auth_required", () => {
  expect(isServerSessionRefusal(refusal)).toBe(true);
  expect(isServerSessionRefusal({ status: 401, code: "oauth_expired", message: "Google token expired" })).toBe(false);
  expect(isServerSessionRefusal({ status: 403, code: "auth_required" })).toBe(false);
});

it("sends a revoked session to /login with the page it was on", async () => {
  refreshSession.mockResolvedValue({ data: { session: null }, error: { message: "session_not_found" } });
  await expect(noteServerSessionRefusal(refusal)).resolves.toBe("redirected");
  expect(refreshSession).toHaveBeenCalledTimes(1);
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  const target = String(assign.mock.calls[0][0]);
  expect(target.startsWith("/login")).toBe(true);
  expect(decodeURIComponent(target)).toContain("/agents/new/studio?x=1");
});

it("stays put when the one refresh works, and goes to /login when the server still refuses", async () => {
  refreshSession.mockResolvedValue({ data: { session: { access_token: "jwt2" } }, error: null });
  await expect(noteServerSessionRefusal(refusal)).resolves.toBe("refreshed");
  expect(assign).not.toHaveBeenCalled();
  await expect(noteServerSessionRefusal(refusal)).resolves.toBe("redirected");
  expect(refreshSession).toHaveBeenCalledTimes(1);
  expect(assign).toHaveBeenCalledTimes(1);
});

it("never touches a guest or the sign-in pages", async () => {
  accessToken = null;
  await expect(noteServerSessionRefusal(refusal)).resolves.toBe("ignored");
  accessToken = "jwt";
  window.history.pushState({}, "", "/login");
  await expect(noteServerSessionRefusal(refusal)).resolves.toBe("ignored");
  expect(refreshSession).not.toHaveBeenCalled();
});
