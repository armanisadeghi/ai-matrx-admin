/** @jest-environment node */
/**
 * The password sign-in is a door of the sign-up welcome's found search (review 2026-10-21, finding 8): deleting its
 * `scheduleFoundSearchAtSignIn` call used to leave every test green. The real `login` action runs; only the auth
 * client, the redirect and the network edges are stand-ins.
 */
import { signedUp, network, started, saved, USER_ID } from "@/features/marketing/smart-add/welcome/__tests__/signInHarness";
import { roundSubject, welcomeSubject } from "@/features/marketing/smart-add/welcome/welcomeSession";

const pending: Array<() => Promise<void> | void> = [];
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (fn: () => Promise<void> | void) => {
    pending.push(fn);
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: () => undefined }));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
jest.mock("next/headers", () => ({ headers: async () => new Headers({ host: "www.aimatrx.com" }) }));
const signInWithPassword = jest.fn();
jest.mock("@/utils/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithPassword } }) }));
jest.mock("@/lib/guest/session-handover", () => ({
  handOverSession: (_via: string, replace: () => Promise<unknown>) => replace(),
  rememberGuestVisitorId: async () => undefined,
}));
jest.mock("@/utils/auth/pending-signup", () => ({
  clearPendingSignupEmail: async () => undefined,
  rememberPendingSignupEmail: async () => undefined,
}));
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

// eslint-disable-next-line import/first -- the action must load after its mocks
import { login } from "../actions";

function form(): FormData {
  const f = new FormData();
  f.set("email", "jmarsh@example.com");
  f.set("password", "a-test-password");
  return f;
}
async function runAfterWork() {
  while (pending.length) await pending.shift()!();
}

describe("the found search starts at a password sign-in, on the server", () => {
  beforeEach(() => {
    pending.length = 0;
    jest.restoreAllMocks();
    recordSystemError.mockClear();
    signInWithPassword.mockReset();
  });

  it("returns at once, then starts the round as the person (run first, then the state)", async () => {
    const user = signedUp();
    signInWithPassword.mockResolvedValue({ data: { user, session: { access_token: "person-token", user } }, error: null });
    const calls = network(user);
    const result = await login("/dashboard", form());
    expect(result).toHaveProperty("hardRedirect");
    expect(calls).toHaveLength(0);
    expect(pending).toHaveLength(1);
    await runAfterWork();
    const start = started(calls);
    expect(start?.headers.authorization).toBe("Bearer person-token");
    expect(start?.body).toMatchObject({ subject: roundSubject(welcomeSubject(USER_ID), 0) });
    expect(calls.indexOf(start!)).toBeLessThan(calls.indexOf(saved(calls)!));
  });

  it("a failed start is recorded against the password door", async () => {
    const user = signedUp();
    signInWithPassword.mockResolvedValue({ data: { user, session: { access_token: "person-token", user } }, error: null });
    network(user, { aidream: () => new Response("{}", { status: 500 }) });
    await login("/dashboard", form());
    await runAfterWork();
    expect(recordSystemError).toHaveBeenCalledWith(
      "record_system_error",
      expect.objectContaining({ p_error: expect.objectContaining({ route: "/login", metadata: expect.objectContaining({ door: "password_login" }) }) }),
    );
  });

  it("a wrong password starts nothing", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Invalid login credentials", code: "invalid_credentials" } });
    await expect(login("/dashboard", form())).rejects.toThrow(/REDIRECT/);
    expect(pending).toHaveLength(0);
  });
});
