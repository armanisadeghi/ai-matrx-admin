/** @jest-environment node */
// CLOSE-PAY 2026-10-21, live: the first visit to https://ridge-pages.kidsmatrx.com/ answered 503 "This site is
// temporarily unavailable" (the lookup's one 2.5 s try timed out on a cold instance); the next visit was 200.
// A business's visitor must not meet that on a passing hiccup: a lookup that times out or answers 5xx is asked
// once more before the host is called unavailable. Two failures still throw (the proxy says 503, never the app).

import { lookupDomain, DomainLookupUnavailable } from "../lookup";

const live = { organization_id: "0fec03d8-afe5-4ea0-bf14-d0ab18e4a536", routes: [{ path_prefix: "/", target_kind: "portal", target_id: "0fec03d8-afe5-4ea0-bf14-d0ab18e4a536" }] };

describe("a slow first lookup is asked again", () => {
  const realFetch = global.fetch;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable";
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  it("serves the host when the second try answers", async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      if (calls === 1) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      return new Response(JSON.stringify(live), { status: 200 });
    }) as unknown as typeof fetch;
    await expect(lookupDomain("slow-once.example.com")).resolves.toEqual(live);
    expect(calls).toBe(2);
  });

  it("retries a 5xx once too", async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      return calls === 1 ? new Response("upstream", { status: 503 }) : new Response(JSON.stringify(live), { status: 200 });
    }) as unknown as typeof fetch;
    await expect(lookupDomain("five-hundred-once.example.com")).resolves.toEqual(live);
  });

  it("still says unavailable after two failures", async () => {
    global.fetch = jest.fn(async () => new Response("upstream", { status: 503 })) as unknown as typeof fetch;
    await expect(lookupDomain("down.example.com")).rejects.toBeInstanceOf(DomainLookupUnavailable);
  });
});
