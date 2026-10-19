/** @jest-environment node */
// An OAuth app is registered as client_secret_basic. The proxy must hand the Authorization header to
// Supabase, or the secret never arrives and every confidential client is refused (AT-WALK-E5).
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.example.test";

describe("POST /api/oauth/token", () => {
  it("forwards the Authorization header upstream", async () => {
    const seen: Array<Record<string, string>> = [];
    global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
      seen.push(init?.headers as Record<string, string>);
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Basic abc123" },
      body: "grant_type=authorization_code&code=x",
    });
    await POST(req as unknown as import("next/server").NextRequest);
    expect(seen[0].Authorization).toBe("Basic abc123");
  });
});
