/** @jest-environment node */
/**
 * The cases every sign-in door shares (review 2026-10-21, finding 8), through the one function all three doors call:
 * an account made before the background search shipped, a persona marked to skip it, and an account in several
 * organizations (left to the browser, not a failure). Real code; only the network edges are stand-ins.
 */
import { signedUp, network, started, SECOND_ORG_ID, ORG_ID } from "./signInHarness";

const pending: Array<() => Promise<void> | void> = [];
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (fn: () => Promise<void> | void) => {
    pending.push(fn);
  },
}));
jest.mock("@/lib/api/endpoints", () => ({ AIDREAM_PRODUCTION_URL: "https://server.example.test" }));
const recordSystemError = jest.fn(async (_name: string, _args: unknown) => ({ error: null }));
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({ schema: () => ({ rpc: (name: string, args: unknown) => recordSystemError(name, args) }) }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.example.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";

// eslint-disable-next-line import/first -- after the mocks
import { scheduleFoundSearchAtSignIn } from "../foundSearchAtSignIn";

const session = (user: ReturnType<typeof signedUp>) => ({ access_token: "person-token", user }) as never;
async function runAfterWork() {
  while (pending.length) await pending.shift()!();
}

describe("sign-in doors: who is and is not started", () => {
  beforeEach(() => {
    pending.length = 0;
    jest.restoreAllMocks();
    recordSystemError.mockClear();
  });

  it("an account made before 2026-10-17 is never started (its way in is /welcome?found=1)", async () => {
    const old = signedUp({}, { created_at: "2026-09-01T00:00:00Z" });
    const calls = network(old);
    scheduleFoundSearchAtSignIn(session(old), "password_login");
    expect(pending).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it("a persona marked to skip it is never started", async () => {
    const persona = signedUp({}, { app_metadata: { provider: "email", providers: ["email"], test_fixture: { suite: "s", purpose: "p", skip_found_search: true } } });
    const calls = network(persona);
    scheduleFoundSearchAtSignIn(session(persona), "email_confirm");
    expect(pending).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it("a persona NOT marked to skip it (a welcome test opted in) is started", async () => {
    const persona = signedUp({}, { app_metadata: { provider: "email", providers: ["email"], test_fixture: { suite: "s", purpose: "p" } } });
    const calls = network(persona);
    scheduleFoundSearchAtSignIn(session(persona), "email_confirm");
    expect(pending).toHaveLength(1);
    await runAfterWork();
    expect(started(calls)).toBeDefined();
  });

  it("an account in several organizations is left to the browser: no run, no state, no failure filed", async () => {
    const user = signedUp();
    const calls = network(user, { orgs: [ORG_ID, SECOND_ORG_ID] });
    scheduleFoundSearchAtSignIn(session(user), "oauth_callback");
    await runAfterWork();
    expect(started(calls)).toBeUndefined();
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
    expect(recordSystemError).not.toHaveBeenCalled();
  });
});
