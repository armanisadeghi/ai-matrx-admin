/** @jest-environment node */
// REVIEW-PAYMENTS I3: /api/payments/return?back=... must only ever send the payer to a path on this
// site. The WHATWG URL parser reads "\" (and tab/newline) like "/", so "/\evil.com" used to leave.

jest.mock("@/features/payments/server", () => ({ settleFromReturn: jest.fn() }));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/payments/return/route";
import { safeReturnPath } from "@/features/payments/amount";

const ORIGIN = "https://www.aimatrx.com";

async function locationFor(back: string): Promise<URL> {
  const res = await GET(new NextRequest(`${ORIGIN}/api/payments/return?cancelled=1&back=${back}`));
  return new URL(res.headers.get("location") ?? "");
}

describe("payments return route stays on this site", () => {
  it.each(["/%5Cevil.com", "/%5C%5Cevil.com", "/%09/evil.com", "%2F%2Fevil.com", "https://evil.com", "/%0A/evil.com", "/%5C/evil.com", "/.//evil.com", "/..//evil.com", "/%2e%2e//evil.com", "/a/..//evil.com", "/%2E//evil.com"])(
    "back=%s lands on this origin",
    async (back) => {
      const loc = await locationFor(back);
      expect(loc.origin).toBe(ORIGIN);
      expect(loc.searchParams.get("payment")).toBe("cancelled");
    },
  );

  it("keeps a real path and its query", async () => {
    const loc = await locationFor(encodeURIComponent("/portal/c/acme/r/123?x=1"));
    expect(loc.origin).toBe(ORIGIN);
    expect(loc.pathname).toBe("/portal/c/acme/r/123");
    expect(loc.searchParams.get("x")).toBe("1");
  });

  it("safeReturnPath refuses backslashes and control characters", () => {
    expect(safeReturnPath("/\\evil.com", ORIGIN)).toBe("/");
    expect(safeReturnPath("/\t/evil.com", ORIGIN)).toBe("/");
    expect(safeReturnPath("//evil.com", ORIGIN)).toBe("/");
    expect(safeReturnPath("/b/abc", ORIGIN)).toBe("/b/abc");
    // N1: dot-segments must not collapse into a protocol-relative path
    expect(safeReturnPath("/.//evil.com", ORIGIN)).toBe("/");
    expect(safeReturnPath("/..//evil.com", ORIGIN)).toBe("/");
    expect(safeReturnPath("/%2e%2e//evil.com", ORIGIN)).toBe("/");
  });
});

describe("payments return route lands on the host the payer came from (portal walk 2026-10-19)", () => {
  it("uses the browser-facing host, not Next's own origin", async () => {
    const req = new NextRequest(`${ORIGIN}/api/payments/return?cancelled=1&back=%2Fportal%2Fc%2Fx%2Fr%2Fy`, {
      headers: { host: "s1.localhost:3001", "x-forwarded-proto": "http" },
    });
    const loc = new URL((await GET(req)).headers.get("location") ?? "");
    expect(loc.origin).toBe("http://s1.localhost:3001");
    expect(loc.pathname).toBe("/portal/c/x/r/y");
  });
});
