/** @jest-environment jsdom */
/**
 * Review I5 + I6 (2026-10-22). The human check used to run before EVERY signed-out request, even with the
 * server mode off, and after a failure each request could wait up to 15 s; concurrent first requests
 * shared ONE single-use token, so all but one were refused under enforce (and logged "failed" in shadow).
 * Now (lib/guest/turnstile.ts): the server's policy decides; the check runs only for a mint, as ONE
 * single-flight POST; everyone else awaits it and sends no token; a failure is remembered, never re-waited.
 */
jest.mock("@/lib/services/fingerprint-service", () => ({ getFingerprint: async () => "fp-1" }));

type Policy = { mode: string; has_identity: boolean };

function policyRes(p: Policy): Response {
  return new Response(
    JSON.stringify({ ...p, recheck_seconds: 300, token_wait_ms: 200, failure_cache_seconds: 60 }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("ensureGuestIdentity", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const originalFetch = global.fetch;
  let render: jest.Mock;
  let fetchMock: jest.Mock;
  let answer: "token" | "error";

  beforeEach(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    window.localStorage.clear();
    answer = "token";
    let n = 0;
    render = jest.fn((_el: HTMLElement, opts: { callback: (t: string) => void; "error-callback": () => void }) => {
      n += 1;
      const tok = `tok-${n}`;
      setTimeout(() => (answer === "token" ? opts.callback(tok) : opts["error-callback"]()), 0);
      return `w${n}`;
    });
    (window as { turnstile?: unknown }).turnstile = { render, execute: jest.fn(), reset: jest.fn(), remove: jest.fn() };
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = ORIGINAL;
    delete (window as { turnstile?: unknown }).turnstile;
    global.fetch = originalFetch;
    jest.resetModules();
  });

  const load = async () => import("@/lib/guest/turnstile");

  it("server mode off: no human check at all, and the mode is remembered", async () => {
    fetchMock.mockResolvedValue(policyRes({ mode: "off", has_identity: false }));
    const t = await load();
    await expect(t.ensureGuestIdentity()).resolves.toBe(true);
    await expect(t.ensureGuestIdentity()).resolves.toBe(true);
    expect(render).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1); // one cheap policy read, then nothing
  });

  it("concurrent first requests share ONE mint; one token, used once; nobody else carries one", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === "POST" ? policyRes({ mode: "enforce", has_identity: true }) : policyRes({ mode: "enforce", has_identity: false }),
    );
    const t = await load();
    const results = await Promise.all([t.ensureGuestIdentity(), t.ensureGuestIdentity(), t.ensureGuestIdentity()]);
    expect(results).toEqual([true, true, true]);
    expect(render).toHaveBeenCalledTimes(1);
    const posts = fetchMock.mock.calls.filter(([, init]) => (init as RequestInit).method === "POST");
    expect(posts).toHaveLength(1);
    const headers = (posts[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["X-Turnstile-Token"]).toBe("tok-1");
    expect(headers["X-Fingerprint-ID"]).toBe("fp-1");
    // the visitor exists now: later requests never check or fetch again
    await t.ensureGuestIdentity();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(t.guestChallengeToken()).resolves.toBeNull(); // the chat package's turns carry no token
  });

  it("a returning visitor (identity already there) is never checked", async () => {
    fetchMock.mockResolvedValue(policyRes({ mode: "shadow", has_identity: true }));
    const t = await load();
    await expect(t.ensureGuestIdentity()).resolves.toBe(true);
    expect(render).not.toHaveBeenCalled();
  });

  it("a failed check is remembered: the next requests do not wait or check again", async () => {
    answer = "error";
    fetchMock.mockResolvedValue(policyRes({ mode: "enforce", has_identity: false }));
    const t = await load();
    await expect(t.ensureGuestIdentity()).resolves.toBe(false);
    const started = Date.now();
    await expect(t.ensureGuestIdentity()).resolves.toBe(false);
    await expect(t.ensureGuestIdentity({ fresh: true })).resolves.toBe(false);
    expect(Date.now() - started).toBeLessThan(50);
    expect(render).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("no site key: nothing loads and nothing waits", async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const t = await load();
    await expect(t.ensureGuestIdentity()).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
