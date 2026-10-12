/**
 * isGuest / hasAccount on the server door and the verdict (guests-use-everything D2).
 *
 * A guest — an anonymous Supabase session, JWT claim `is_anonymous: true` —
 * is still SIGNED IN (identity, so every existing branch answers as before)
 * but has no account. Built from REAL claim envelopes through `userFromClaims`,
 * the same constructor `getClaimsUser` uses.
 */
jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("./../getServerAuth", () => ({ getServerAuth: jest.fn() }));

import { accountFlagsFor, userFromClaims } from "@ai-matrx/auth";
import { sessionVerdictFrom } from "../sessionVerdict";

const anonymousJwt = userFromClaims({
  sub: "guest-1",
  aud: "authenticated",
  role: "authenticated",
  aal: "aal1",
  session_id: "session-1",
  is_anonymous: true,
  iat: 1,
  exp: 2,
  iss: "https://db.matrxserver.com/auth/v1",
});
const permanentJwt = userFromClaims({
  sub: "member-1",
  aud: "authenticated",
  role: "authenticated",
  aal: "aal1",
  session_id: "session-1",
  is_anonymous: false,
  email: "m@example.test",
  iat: 1,
  exp: 2,
  iss: "https://db.matrxserver.com/auth/v1",
});

describe("accountFlagsFor", () => {
  it("an anonymous JWT is a guest without an account", () => {
    expect(accountFlagsFor(anonymousJwt)).toEqual({ isGuest: true, hasAccount: false });
  });
  it("a permanent JWT has an account", () => {
    expect(accountFlagsFor(permanentJwt)).toEqual({ isGuest: false, hasAccount: true });
  });
  it("a JWT with no is_anonymous claim is a member (older tokens)", () => {
    const { is_anonymous: _omit, ...rest } = permanentJwt!;
    expect(accountFlagsFor(rest as { is_anonymous?: boolean })).toEqual({ isGuest: false, hasAccount: true });
  });
  it("no session is neither", () => {
    expect(accountFlagsFor(null)).toEqual({ isGuest: false, hasAccount: false });
  });
});

describe("sessionVerdictFrom carries the flags additively", () => {
  it("a guest is still signed_in (identity unchanged) with hasAccount false", () => {
    const v = sessionVerdictFrom({ user: anonymousJwt, authUnavailable: false });
    expect(v).toMatchObject({ state: "signed_in", isAuthenticated: true, isGuest: true, hasAccount: false });
  });
  it("a member is signed_in with hasAccount true", () => {
    const v = sessionVerdictFrom({ user: permanentJwt, authUnavailable: false });
    expect(v).toMatchObject({ state: "signed_in", isAuthenticated: true, isGuest: false, hasAccount: true });
  });
  it("signed out and unverified have neither", () => {
    expect(sessionVerdictFrom({ user: null, authUnavailable: false })).toMatchObject({ state: "signed_out", hasAccount: false, isGuest: false });
    expect(sessionVerdictFrom({ user: null, authUnavailable: true })).toMatchObject({ state: "unverified", hasAccount: false, isGuest: false });
  });
});
