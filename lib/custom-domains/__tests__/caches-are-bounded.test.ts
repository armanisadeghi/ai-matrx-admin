// Arbitrary Host headers must never grow server memory: both per-instance maps are capped.
import { MAX_TRACKED_HOSTS, claimRecheck, trackedHostCount, RECHECK_MS } from "../recheck";
import { cachedHostCount, lookupDomain } from "../lookup";

describe("the re-check throttle", () => {
  it("never tracks more than MAX_TRACKED_HOSTS hosts and still throttles a recent host", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_TRACKED_HOSTS * 2; i += 1) claimRecheck(`h${i}.example.com`, now);
    expect(trackedHostCount()).toBeLessThanOrEqual(MAX_TRACKED_HOSTS);
    const recent = `h${MAX_TRACKED_HOSTS * 2 - 1}.example.com`;
    expect(claimRecheck(recent, now + 1)).toBe(false);
    expect(claimRecheck(recent, now + RECHECK_MS)).toBe(true);
  });
});

describe("the host lookup cache", () => {
  const realFetch = global.fetch;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable";
    global.fetch = jest.fn(async () => new Response("null", { status: 200 })) as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });
  it("stays bounded under thousands of unknown hosts", async () => {
    for (let i = 0; i < 2_500; i += 1) await lookupDomain(`unknown-${i}.example.com`);
    expect(cachedHostCount()).toBeLessThanOrEqual(2_000);
  });
});
