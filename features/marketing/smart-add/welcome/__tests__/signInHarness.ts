/**
 * Shared stand-ins for the sign-in door tests (confirm link, OAuth callback, password login): the account as the auth
 * server returns it, and the three network edges (auth server, the database's REST door, aidream). Everything else in
 * the door and in the found-search start is the real code. Not a test file (jest runs only *.test.*).
 */
export const USER_ID = "0f6c2d7e-4b1a-4c55-9a3e-2d8f6b7c1a90";
export const ORG_ID = "93ab3512-dbe2-4e02-8721-12e23b61f597";
export const SECOND_ORG_ID = "5d1c0e84-7a0b-4f0c-9a52-0a6a0f3f1d11";

/** An email + password account like the 10-20 ones: confirmed, no name anywhere. Override any top-level field. */
export function signedUp(meta: Record<string, unknown> = {}, over: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    aud: "authenticated",
    email: "jmarsh@example.com",
    email_confirmed_at: "2026-10-20T17:49:15Z",
    created_at: "2026-10-20T17:48:57Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { sub: USER_ID, email: "jmarsh@example.com", email_verified: true, phone_verified: false, ...meta },
    identities: [{ id: USER_ID, user_id: USER_ID, identity_id: "i1", provider: "email", identity_data: { email: "jmarsh@example.com", sub: USER_ID } }],
    ...over,
  };
}

export interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export const aidreamOk = () => new Response(JSON.stringify({ run_id: "run-1", mode: "detached", status: "running" }), { status: 200 });

export function network(
  account: Record<string, unknown>,
  { aidream = aidreamOk, orgs = [ORG_ID] }: { aidream?: () => Response; orgs?: string[] } = {},
) {
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
      return json(orgs.map((id) => ({ organization_id: id, organizations: { id, name: "An Organization" } })));
    if (url.startsWith("https://server.example.test/workflows/system/smart_add_brand_identify/runs")) return aidream();
    throw new Error(`unexpected request ${method} ${url}`);
  });
  return calls;
}

export const started = (calls: Call[]) => calls.find((c) => c.method === "POST" && c.url.includes("/workflows/system/"));
export const saved = (calls: Call[]) => calls.find((c) => c.method === "PUT" && c.url.endsWith("/auth/v1/user"));
