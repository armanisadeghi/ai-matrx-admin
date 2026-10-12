/** @jest-environment node */
/**
 * Organization admission for `postJsonAsUser` (sender-side, fail-closed).
 * Ported from the retired BackendClient test: a signed-in write with no
 * organization never reaches the wire; with one it carries X-Organization-Id
 * in the HEADER and never in the body.
 */

import { postJsonAsUser } from "@/lib/api/post-json-as-user";
import { OrganizationContextError } from "@/lib/api/organization-context";

const ORG_ID = "5dc930e9-bd65-44a1-8369-af773f6e1a5b";
const BASE = "https://server.example.test";

function okFetch() {
  return jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("postJsonAsUser organization admission", () => {
  it("REFUSAL: a write with no organization never reaches the wire", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      postJsonAsUser({
        baseUrl: BASE,
        accessToken: "test-token",
        organizationId: null,
        path: "/some/endpoint",
      }),
    ).rejects.toThrow(OrganizationContextError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CONTROL: with an organization it sends Bearer + X-Organization-Id, org absent from the body, and strips a leading /api/", async () => {
    const fetchMock = okFetch();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(
      postJsonAsUser({
        baseUrl: `${BASE}/`,
        accessToken: "test-token",
        organizationId: ORG_ID,
        path: "/api/some/endpoint",
        body: { a: 1 },
      }),
    ).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/some/endpoint`);
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Organization-Id"]).toBe(ORG_ID);
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(String(init.body))).toEqual({ a: 1 });
  });

  it("a non-2xx answer throws the server's own error", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: { code: "nope", message: "No." } }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    await expect(
      postJsonAsUser({
        baseUrl: BASE,
        accessToken: "t",
        organizationId: ORG_ID,
        path: "/x",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
