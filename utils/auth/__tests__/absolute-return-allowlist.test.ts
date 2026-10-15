/**
 * W1-H2: the absolute-URL return allowlist. Office hosts (docs.aimatrx.com …)
 * send a signed-out visitor to www login with an absolute `next`; only the
 * aimatrx.com family may come back.
 */
import {
  normalizeAuthDestination,
  readAuthDestination,
  loginHref,
} from "@/utils/auth/auth-destination";
import { safeReturnUrl } from "@/utils/auth/safe-redirect";

describe("absolute return allowlist", () => {
  it("allows https on aimatrx.com and its subdomains", () => {
    expect(normalizeAuthDestination("https://docs.aimatrx.com/f/x")).toBe(
      "https://docs.aimatrx.com/f/x",
    );
    expect(normalizeAuthDestination("https://aimatrx.com/tasks")).toBe(
      "https://aimatrx.com/tasks",
    );
    expect(safeReturnUrl("https://sheets.aimatrx.com/f/1?a=b", "/")).toBe(
      "https://sheets.aimatrx.com/f/1?a=b",
    );
  });

  it("allows it encoded, as it rides through a login link", () => {
    const enc = encodeURIComponent("https://docs.aimatrx.com/f/x");
    expect(readAuthDestination(`/login?next=${enc}`)).toBe(
      "https://docs.aimatrx.com/f/x",
    );
    expect(loginHref("https://docs.aimatrx.com/f/x")).toBe(
      `/login?redirectTo=${enc}`,
    );
  });

  it.each([
    "https://evil.com",
    "https://aimatrx.com.evil.com",
    "https://evilaimatrx.com",
    "https://evil.com/.aimatrx.com",
    "https://evil.com?x=.aimatrx.com",
    "https://docs.aimatrx.com@evil.com/",
    "https://evil.com@docs.aimatrx.com/",
    "https://docs.aimatrx.com\\@evil.com/",
    "https://docs.aimatrx.com:8443/f/x",
    "http://docs.aimatrx.com/f/x",
    "javascript://docs.aimatrx.com/%0aalert(1)",
    "//docs.aimatrx.com/f/x",
  ])("refuses %s", (bad) => {
    expect(normalizeAuthDestination(bad)).toBeNull();
    expect(safeReturnUrl(bad, "/fallback")).toBe("/fallback");
  });

  it("never makes an auth page on an Office host a destination", () => {
    expect(normalizeAuthDestination("https://docs.aimatrx.com/login")).toBeNull();
  });
});
