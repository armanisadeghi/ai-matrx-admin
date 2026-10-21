/** @jest-environment jsdom */
/**
 * The fingerprint (header) lane mints a visitor on its first request, so a Turnstile token must be HELD
 * before that request goes out (lib/guest/turnstile.ts). No site key → nothing held, nothing waits.
 */

describe("held guest challenge token", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  afterEach(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = ORIGINAL;
    delete (window as { turnstile?: unknown }).turnstile;
    jest.resetModules();
  });

  it("with no site key nothing is held and priming answers null at once", async () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const t = await import("@/lib/guest/turnstile");
    await expect(t.primeGuestChallenge()).resolves.toBeNull();
    expect(t.heldGuestChallengeToken()).toBeNull();
  });

  it("primes once, holds the token for the synchronous header builders, single flight", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    const render = jest.fn((_el: HTMLElement, opts: { callback: (t: string) => void }) => {
      setTimeout(() => opts.callback("tok-1"), 0);
      return "w1";
    });
    (window as { turnstile?: unknown }).turnstile = { render, execute: jest.fn(), reset: jest.fn(), remove: jest.fn() };
    const t = await import("@/lib/guest/turnstile");
    const [a, b] = await Promise.all([t.primeGuestChallenge(), t.primeGuestChallenge()]);
    expect(a).toBe("tok-1");
    expect(b).toBe("tok-1");
    expect(render).toHaveBeenCalledTimes(1);
    expect(t.heldGuestChallengeToken()).toBe("tok-1");
    await t.primeGuestChallenge();
    expect(render).toHaveBeenCalledTimes(1); // held: no second check
  });
});
