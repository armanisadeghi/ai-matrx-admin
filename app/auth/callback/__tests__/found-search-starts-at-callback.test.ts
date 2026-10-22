/** @jest-environment node */
/**
 * The OAuth callback is a sign-in door of the sign-up welcome's found search (review 2026-10-21, finding 8): deleting
 * its `scheduleFoundSearchAtSignIn` call used to leave every test green. The real route runs; only the cookie jar,
 * the code exchange and the network edges are stand-ins.
 */
import { signedUp, network, started, saved, aidreamOk, USER_ID } from "@/features/marketing/smart-add/welcome/__tests__/signInHarness";
import { roundSubject, welcomeSubject } from "@/features/marketing/smart-add/welcome/welcomeSession";

const pending: Array<() => Promise<void> | void> = [];
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (fn: () => Promise<void> | void) => {
    pending.push(fn);
  },
}));
jest.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => undefined }),
  headers: async () => new Headers({ host: "www.aimatrx.com" }),
}));
const exchangeCodeForSession = jest.fn();
jest.mock("@/utils/supabase/authCookie", () => ({
  ...jest.requireActual("@/utils/supabase/authCookie"),
  supabaseNext: { serverClient: () => ({ auth: { exchangeCodeForSession, updateUser: jest.fn() } }) },
}));
jest.mock("@/utils/supabase/claimsUser", () => ({ getClaimsUser: async () => ({ data: { user: null } }) }));
jest.mock("@/lib/guest/session-handover", () => ({
  handOverSession: (_via: string, replace: () => Promise<unknown>) => replace(),
  takeGuestVisitorId: async () => null,
}));
jest.mock("@/lib/product-analytics/server/acquisition-persistence", () => ({ linkAcquisitionToUser: async () => undefined }));
jest.mock("@/features/shell/shell-layout/server", () => ({
  markShellLayoutDeviceAtSignIn: async () => undefined,
  shellLandingAfterSignIn: async () => null,
}));
jest.mock("@/lib/api/endpoints", () => ({ AIDREAM_PRODUCTION_URL: "https://server.example.test" }));
const recordSystemError = jest.fn(async (_name: string, _args: unknown) => ({ error: null }));
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({ schema: () => ({ rpc: (name: string, args: unknown) => recordSystemError(name, args) }) }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.example.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";

// eslint-disable-next-line import/first -- the route must load after its mocks
import { GET } from "../route";

async function callback(query = "code=abc"): Promise<Response> {
  return GET(new Request(`https://www.aimatrx.com/auth/callback?${query}`));
}
async function runAfterWork() {
  while (pending.length) await pending.shift()!();
}
function signIn(user: Record<string, unknown>) {
  exchangeCodeForSession.mockResolvedValue({ data: { user, session: { access_token: "person-token", user } }, error: null });
}

describe("the found search starts at the OAuth callback, on the server", () => {
  beforeEach(() => {
    pending.length = 0;
    jest.restoreAllMocks();
    recordSystemError.mockClear();
    exchangeCodeForSession.mockReset();
  });

  it("redirects at once, then starts the round as the person (run first, then the state)", async () => {
    const user = signedUp({}, { app_metadata: { provider: "google", providers: ["google"] } });
    signIn(user);
    const calls = network(user);
    const response = await callback();
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(calls).toHaveLength(0);
    expect(pending).toHaveLength(1);
    await runAfterWork();
    const start = started(calls);
    expect(start?.headers.authorization).toBe("Bearer person-token");
    expect(start?.body).toMatchObject({ subject: roundSubject(welcomeSubject(USER_ID), 0), mode: "detached" });
    expect(calls.indexOf(start!)).toBeLessThan(calls.indexOf(saved(calls)!));
  });

  it("a failed start is recorded against the callback door", async () => {
    const user = signedUp();
    signIn(user);
    network(user, { aidream: () => new Response("{}", { status: 500 }) });
    await callback();
    await runAfterWork();
    expect(recordSystemError).toHaveBeenCalledWith(
      "record_system_error",
      expect.objectContaining({ p_error: expect.objectContaining({ route: "/auth/callback", metadata: expect.objectContaining({ door: "oauth_callback" }) }) }),
    );
  });

  it("an anonymous session and a recovery link never start one", async () => {
    const anon = signedUp({}, { is_anonymous: true });
    signIn(anon);
    network(anon, { aidream: aidreamOk });
    await callback();
    expect(pending).toHaveLength(0);
    const user = signedUp();
    signIn(user);
    await callback("code=abc&type=recovery");
    expect(pending).toHaveLength(0);
  });
});
