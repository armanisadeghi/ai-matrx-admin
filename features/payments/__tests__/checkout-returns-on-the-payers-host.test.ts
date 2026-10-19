/** @jest-environment node */
// Stripe's success/cancel URLs for a form or booking payment must be built on the host the payer is
// on (x-forwarded-host, else host) — not new URL(request.url).origin (plain localhost behind a dev
// proxy, the internal host behind a custom domain) and not the Origin header (an embedder's site).

const checkoutIfAsked = jest.fn(async () => ({ url: "https://checkout.stripe.test/x" }));
jest.mock("@/features/payments/server", () => ({ checkoutIfAsked: (...a: unknown[]) => (checkoutIfAsked as jest.Mock)(...a) }));
jest.mock("@/lib/custom-domains/request-host", () => ({ pathOnRequestHost: async (_r: unknown, p: string) => p }));
jest.mock("@/features/forms/service", () => ({
  publicForm: async () => ({ fields: [], honeypot_key: null }),
  submitPublicForm: async () => ({ state: "accepted", message: "ok", record_id: "rec1" }),
  confirmBooking: async () => ({ state: "confirmed", message: "ok", record_id: "rec1", booking_ref: "b" }),
}));
jest.mock("@ai-matrx/records/forms", () => ({ typedAnswersFor: (_f: unknown, v: unknown) => ({ values: v }) }));

import { requestHostOrigin } from "@/utils/auth/request-origin";

describe("requestHostOrigin", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  it("uses x-forwarded-host, else host, never origin", () => {
    expect(requestHostOrigin(h({ "x-forwarded-host": "book.theirbusiness.com", "x-forwarded-proto": "https", host: "localhost:3001", origin: "https://embedder.example" }))).toBe("https://book.theirbusiness.com");
    expect(requestHostOrigin(h({ host: "s1.localhost:3001", origin: "https://embedder.example" }))).toBe("http://s1.localhost:3001");
  });
});

describe("form checkout starts on the payer's host", () => {
  it("passes the forwarded host, not request.url's origin", async () => {
    const { POST } = await import("@/app/api/forms/[formId]/submit/route");
    const req = new Request("http://localhost:3001/api/forms/f1/submit", {
      method: "POST",
      headers: { "x-forwarded-host": "book.theirbusiness.com", "x-forwarded-proto": "https", origin: "https://embedder.example", "content-type": "application/json" },
      body: JSON.stringify({ values: {} }),
    });
    await POST(req, { params: Promise.resolve({ formId: "f1" }) });
    expect(checkoutIfAsked).toHaveBeenCalledWith(expect.objectContaining({ origin: "https://book.theirbusiness.com" }));
  });
});
