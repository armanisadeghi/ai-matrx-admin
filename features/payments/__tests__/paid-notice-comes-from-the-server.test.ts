/** @jest-environment node */
// REVIEW-PAYMENTS I4: the form and booking pages say "paid" only when the server read a paid payment
// for THIS subject. ?payment=paid typed into the address bar, or a pid of another page's payment,
// shows nothing. A cancelled return offers Pay again for the payment's own record (I7).

jest.mock("server-only", () => ({}));
const verifiedReturn = jest.fn();
const checkoutRefusal = jest.fn();
jest.mock("@/features/payments/server", () => ({ verifiedReturn, checkoutRefusal }));

import { paymentNoticeFor } from "@/features/payments/notice";

const SUBJECT = "c1309b93-28ea-4bcf-89dd-aeebcdaa5558";
const PID = "01113643-0000-4000-8000-000000000000";
const REC = "ae4c110c-cf55-4acc-96dc-bd10ddd34802";

beforeEach(() => {
  verifiedReturn.mockReset();
  checkoutRefusal.mockReset();
});

describe("payment notice is read on the server", () => {
  it("a hand-typed ?payment=paid with no payment says nothing", async () => {
    verifiedReturn.mockResolvedValue(null);
    expect(await paymentNoticeFor(SUBJECT, { payment: "paid" }, "/b/x")).toBeNull();
  });

  it("?payment=paid naming an unpaid payment does not say paid", async () => {
    verifiedReturn.mockResolvedValue({ status: "pending", recordId: REC });
    const n = await paymentNoticeFor(SUBJECT, { payment: "paid", pid: PID }, "/b/x");
    expect(n?.outcome).not.toBe("paid");
    expect(verifiedReturn).toHaveBeenCalledWith(SUBJECT, PID);
  });

  it("a paid payment for this subject says paid, whatever the word", async () => {
    verifiedReturn.mockResolvedValue({ status: "paid", recordId: REC });
    expect((await paymentNoticeFor(SUBJECT, { payment: "cancelled", pid: PID }, "/b/x"))?.outcome).toBe("paid");
  });

  it("cancelled offers Pay again for the payment's own record", async () => {
    verifiedReturn.mockResolvedValue({ status: "pending", recordId: REC });
    const n = await paymentNoticeFor(SUBJECT, { payment: "cancelled", pid: PID }, "/b/x");
    expect(n).toEqual({ outcome: "cancelled", retry: { subjectId: SUBJECT, recordId: REC, back: "/b/x" } });
  });

  it("refused carries the server's reason and Pay now", async () => {
    checkoutRefusal.mockResolvedValue("The connected Stripe account cannot take payments until its setup is finished.");
    const n = await paymentNoticeFor(SUBJECT, { payment: "refused", rec: REC }, "/b/x");
    expect(n?.outcome).toBe("refused");
    expect(n?.reason).toMatch(/setup is finished/);
    expect(n?.retry?.recordId).toBe(REC);
  });
});
