/** @jest-environment node */
// CD-PAY-06: the payment return never sends a visitor to another site. The host a payer comes back
// to is the host the request was SERVED on (x-forwarded-host, else host) — never the `Origin` header,
// which any other site sets when it posts to us (a cross-site "Pay again" form POST carried
// Origin: https://evil.example and was redirected there, Stripe's success URL included).

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const startCheckout = jest.fn(async (_a: { origin: string }) => ({ url: "https://checkout.stripe.test/x" }));
jest.mock("@/features/payments/server", () => {
  class PaymentRefusal extends Error {}
  return {
    PaymentRefusal,
    settleFromReturn: jest.fn(async () => "paid"),
    readAsk: jest.fn(async () => ({ organization_id: "o" })),
    startCheckout: (a: { origin: string }) => startCheckout(a),
  };
});

import { NextRequest } from "next/server";
import { GET as returnGET } from "@/app/api/payments/return/route";
import { POST as retryPOST } from "@/app/api/payments/retry/route";

const HOST = { host: "book.theirbusiness.com", "x-forwarded-proto": "https", origin: "https://evil.example" };
const UUID = "11111111-1111-4111-8111-111111111111";

describe("payment return stays on the host it was served on", () => {
  it("return route ignores a foreign Origin header", async () => {
    const res = await returnGET(new NextRequest(`https://internal.vercel.app/api/payments/return?cancelled=1&back=%2Fintake`, { headers: HOST }));
    expect(new URL(res.headers.get("location") ?? "").origin).toBe("https://book.theirbusiness.com");
  });

  it("retry refusal ignores a foreign Origin header", async () => {
    const body = new URLSearchParams({ subject: "bogus", record: "bogus", back: "/intake" });
    const res = await retryPOST(
      new NextRequest("https://internal.vercel.app/api/payments/retry", { method: "POST", headers: { ...HOST, "content-type": "application/x-www-form-urlencoded" }, body }),
    );
    expect(new URL(res.headers.get("location") ?? "").origin).toBe("https://book.theirbusiness.com");
  });

  it("a retry POST with no form body is refused back to the page, never a 500", async () => {
    const res = await retryPOST(new NextRequest("https://internal.vercel.app/api/payments/retry", { method: "POST", headers: HOST }));
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location") ?? "").origin).toBe("https://book.theirbusiness.com");
  });

  it("retry hands Stripe the served host, never the Origin header", async () => {
    const body = new URLSearchParams({ subject: UUID, record: UUID, back: "/intake" });
    await retryPOST(
      new NextRequest("https://internal.vercel.app/api/payments/retry", { method: "POST", headers: { ...HOST, "content-type": "application/x-www-form-urlencoded" }, body }),
    );
    expect(startCheckout).toHaveBeenCalledWith(expect.objectContaining({ origin: "https://book.theirbusiness.com" }));
  });
});

// The class: every public payment/form/booking/portal entry builds its payer-facing origin with
// requestHostOrigin. `requestOrigin` (which trusts the Origin header) is for OAuth/sign-in only.
describe("no payer-facing route trusts the Origin header", () => {
  const ROOT = join(__dirname, "..", "..", "..");
  const DIRS = ["app/api/payments", "app/api/forms", "app/api/bookings", "app/api/portal", "app/(portal)", "app/(link)", "features/payments"];
  function files(dir: string): string[] {
    let out: string[] = [];
    let entries: string[] = [];
    try { entries = readdirSync(dir); } catch { return out; }
    for (const name of entries) {
      const p = join(dir, name);
      if (name === "__tests__" || name === "node_modules") continue;
      if (statSync(p).isDirectory()) out = out.concat(files(p));
      else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  }
  it("reads a public POST body without letting a non-form post throw a 500", () => {
    const offenders = DIRS.flatMap((d) => files(join(ROOT, d))).filter((f) => /\.formData\(\)(?!\s*\.catch)/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
  });

  it("imports requestHostOrigin, never requestOrigin", () => {
    const offenders = DIRS.flatMap((d) => files(join(ROOT, d))).filter((f) => /\brequestOrigin\s*\(/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
  });
});
