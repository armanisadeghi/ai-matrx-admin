/** @jest-environment node */
/**
 * THE 10-20 SITUATION (SIGNUP-WELCOME.md § The flow): an email + password person with no name and a company-domain
 * address confirms their email, lands, and leaves within seconds — no browser code of ours ever finishes. The found
 * search must still start: on the server, from the confirm link itself, after the redirect, as that person.
 *
 * Only the network edges are stand-ins (the auth server, the database's REST door, aidream); the confirm route, the
 * scheduling, the start core, the login seed and the first round are the real code.
 */
import { NextRequest } from "next/server";
import { roundSubject, welcomeSubject } from "@/features/marketing/smart-add/welcome/welcomeSession";

const pending: Array<() => Promise<void> | void> = [];
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (fn: () => Promise<void> | void) => {
    pending.push(fn);
  },
}));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
const verifyOtp = jest.fn();
jest.mock("@/utils/supabase/server", () => ({ createClient: async () => ({ auth: { verifyOtp } }) }));
jest.mock("@/lib/guest/session-handover", () => ({
  handOverSession: (_via: string, replace: () => Promise<unknown>) => replace(),
}));
jest.mock("@/utils/auth/pending-signup", () => ({ clearPendingSignupEmail: async () => undefined }));
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

const USER_ID = "0f6c2d7e-4b1a-4c55-9a3e-2d8f6b7c1a90";
const ORG_ID = "93ab3512-dbe2-4e02-8721-12e23b61f597";

/** Exactly the shape of the 10-20 accounts: email + password, confirmed, no name anywhere. */
function signedUp(meta: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    aud: "authenticated",
    email: "jmarsh@example.com",
    email_confirmed_at: "2026-10-20T17:49:15Z",
    created_at: "2026-10-20T17:48:57Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { sub: USER_ID, email: "jmarsh@example.com", email_verified: true, phone_verified: false, ...meta },
    identities: [{ id: USER_ID, user_id: USER_ID, identity_id: "i1", provider: "email", identity_data: { email: "jmarsh@example.com", sub: USER_ID } }],
  };
}

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

function network(account: Record<string, unknown>, aidream: () => Response) {
  const calls: Call[] = [];
  jest.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = typeof init?.body === "string" && init.body ? JSON.parse(init.body) : null;
    calls.push({ method, url, headers, body });
    const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url === "https://db.example.test/auth/v1/user") return json(account);
    if (url.startsWith("https://db.example.test/rest/v1/rpc/domain_categories_snapshot"))
      return json([{ host: "gmail.com", path_pattern: null, category: "free_mail", provenance: "seeded", confidence: 1, label: null }]);
    if (url.startsWith("https://db.example.test/rest/v1/memberships"))
      return json([{ organization_id: ORG_ID, organizations: { id: ORG_ID, name: "J Marsh's Organization" } }]);
    if (url.startsWith("https://server.example.test/workflows/system/smart_add_brand_identify/runs")) return aidream();
    throw new Error(`unexpected request ${method} ${url}`);
  });
  return calls;
}

async function confirm(): Promise<string> {
  const url = new URL("https://www.aimatrx.com/auth/confirm?token_hash=abc&type=signup");
  try {
    await GET(new NextRequest(url));
  } catch (error) {
    return String((error as Error).message);
  }
  return "no redirect";
}

async function runAfterWork() {
  while (pending.length) await pending.shift()!();
}

describe("the found search starts at email confirmation, on the server (the 10-20 accounts)", () => {
  beforeEach(() => {
    pending.length = 0;
    jest.restoreAllMocks();
    recordSystemError.mockClear();
  });

  it("redirects at once, then starts the email + company-site round as the person, with no browser involved", async () => {
    const user = signedUp();
    verifyOtp.mockResolvedValue({ data: { user, session: { access_token: "person-token", user } }, error: null });
    const calls = network(user, () => new Response(JSON.stringify({ run_id: "run-1", mode: "detached", status: "running" }), { status: 200 }));

    expect(await confirm()).toMatch(/^REDIRECT /);
    // Nothing waited on: the start was only scheduled, and the redirect went out before any of it ran.
    expect(calls).toHaveLength(0);
    expect(pending).toHaveLength(1);

    await runAfterWork();

    const save = calls.find((c) => c.method === "PUT" && c.url.endsWith("/auth/v1/user"));
    const start = calls.find((c) => c.method === "POST" && c.url.includes("/workflows/system/"));
    expect(save?.headers.authorization).toBe("Bearer person-token");
    expect(save?.body).toMatchObject({ data: { found_search_round: 0, found_search_checked_at: null } });
    expect(typeof (save?.body as { data: Record<string, unknown> }).data.found_search_started_at).toBe("string");
    expect(start?.headers.authorization).toBe("Bearer person-token");
    expect(start?.headers["x-organization-id"]).toBe(ORG_ID);
    expect(start?.body).toMatchObject({
      subject: roundSubject(welcomeSubject(USER_ID), 0),
      mode: "detached",
      source_feature: "marketing",
      inputs: { email: "jmarsh@example.com", website: "example.com", entry_kind: "person" },
    });
    // The state is recorded BEFORE the run starts, so a second starter never pays twice.
    expect(calls.indexOf(save!)).toBeLessThan(calls.indexOf(start!));
    expect(recordSystemError).not.toHaveBeenCalled();
  });

  it("an account that already started is never started again (no work scheduled)", async () => {
    const user = signedUp({ found_search_started_at: "2026-10-20T17:49:20Z", found_search_round: 0 });
    verifyOtp.mockResolvedValue({ data: { user, session: { access_token: "person-token", user } }, error: null });
    network(user, () => new Response("{}", { status: 200 }));
    expect(await confirm()).toMatch(/^REDIRECT /);
    expect(pending).toHaveLength(0);
  });

  it("a refused start puts the state back and is recorded, so the next load retries it", async () => {
    const user = signedUp();
    verifyOtp.mockResolvedValue({ data: { user, session: { access_token: "person-token", user } }, error: null });
    const calls = network(user, () => new Response(JSON.stringify({ detail: "boom" }), { status: 500 }));
    await confirm();
    await runAfterWork();
    const saves = calls.filter((c) => c.method === "PUT").map((c) => (c.body as { data: Record<string, unknown> }).data);
    expect(saves).toHaveLength(2);
    expect(saves[1]).toMatchObject({ found_search_started_at: null, found_search_round: 0 });
    expect(recordSystemError).toHaveBeenCalledWith(
      "record_system_error",
      expect.objectContaining({ p_error: expect.objectContaining({ kind: "signup_welcome:found-search-start", user_id: USER_ID }) }),
    );
  });
});
