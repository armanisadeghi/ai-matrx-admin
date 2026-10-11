/** @jest-environment node */
/**
 * GUEST vs MEMBER at the proxy (guests-use-everything D2).
 *
 * A guest is an anonymous Supabase session: a verified JWT whose claims carry
 * `is_anonymous: true`. It must REACH /sign-up and /login (that is how a guest
 * becomes a member), and on an account-only route it is sent through the login
 * primitive exactly like a visitor. A member keeps today's behaviour: bounced
 * off the account-entry pages to the landing.
 *
 * Drives the real `updateSession` with a real JWT-claims envelope
 * (`withClaims` derives the claims a token carries for the fake user).
 */
import { withClaims } from "@/test-utils/supabase-auth";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { updateSession } from "./middleware";

jest.mock("@supabase/ssr", () => ({
  ...jest.requireActual("@supabase/ssr"),
  createServerClient: jest.fn(),
}));

const mockedCreateServerClient = createServerClient as jest.Mock;

function signedInAs(user: Record<string, unknown>) {
  mockedCreateServerClient.mockImplementation(() => ({
    auth: withClaims({ getUser: async () => ({ data: { user } }) }),
  }));
}

function request(path: string) {
  return new NextRequest(`https://www.aimatrx.com${path}`, {
    headers: { host: "www.aimatrx.com", cookie: "" },
  });
}

const GUEST = { id: "guest-1", is_anonymous: true, role: "authenticated" };
const MEMBER = { id: "member-1", is_anonymous: false, email: "m@example.test" };

describe("proxy: a guest is not a member", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.matrxserver.com";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test";
    mockedCreateServerClient.mockReset();
  });

  it.each(["/sign-up", "/login", "/check-email"])(
    "a guest REACHES %s (no bounce)",
    async (path) => {
      signedInAs(GUEST);
      const response = await updateSession(request(path));
      expect(response.headers.get("location")).toBeNull();
      expect(response.status).toBe(200);
    },
  );

  it("a guest with a destination on /sign-up is NOT forwarded to it", async () => {
    signedInAs(GUEST);
    const response = await updateSession(request("/sign-up?redirectTo=%2Fnotes"));
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/sign-up", "/login", "/check-email"])(
    "a member on %s is bounced to the landing (unchanged)",
    async (path) => {
      signedInAs(MEMBER);
      const response = await updateSession(request(path));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
    },
  );

  it("a guest on an account-only route goes through login, like a visitor", async () => {
    signedInAs(GUEST);
    const response = await updateSession(request("/tasks"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?redirectTo=");
  });

  it("a member on an account-only route passes (unchanged)", async () => {
    signedInAs(MEMBER);
    const response = await updateSession(request("/tasks"));
    expect(response.headers.get("location")).toBeNull();
  });
});
