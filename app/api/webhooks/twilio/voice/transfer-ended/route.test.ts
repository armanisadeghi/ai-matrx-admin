/** @jest-environment node */
import twilio from "twilio";
import { POST } from "./route";
import { recordVoiceTransferResultObservation } from "@/lib/communications/voice/transfer-result-persistence";
jest.mock("@/lib/communications/voice/transfer-result-persistence", () => ({
  recordVoiceTransferResultObservation: jest.fn(),
}));
import { readVoiceTransferReceipt } from "@/lib/communications/voice/transfer-receipt-persistence";
jest.mock("@/lib/communications/voice/transfer-receipt-persistence", () => ({
  readVoiceTransferReceipt: jest.fn(),
}));
const readReceipt = jest.mocked(readVoiceTransferReceipt);
const persist = jest.mocked(recordVoiceTransferResultObservation);
const identity = {
  AccountSid: "AC" + "1".repeat(32),
  CallSid: "CA" + "2".repeat(32),
  DialCallSid: "CA" + "3".repeat(32),
};
const url = "https://www.aimatrx.com/api/webhooks/twilio/voice/transfer-ended";
const token = "transfer-callback-fixture";
const original = process.env.TWILIO_AUTH_TOKEN;
function request(params: Record<string, string>, forged = false) {
  params = { ...identity, ...params };
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": forged
        ? "forged"
        : twilio.getExpectedTwilioSignature(token, url, params),
    },
    body: new URLSearchParams(params),
  });
}
beforeEach(() => {
  process.env.TWILIO_AUTH_TOKEN = token;
  readReceipt.mockReset().mockResolvedValue({
    state: "consistent",
    deliveryCount: 1,
    firstEventId: 17,
    lastEventId: 17,
    interactionId: "parent",
    organizationId: "org",
    connection: "unknown",
    result: {
      providerAccountId: identity.AccountSid,
      providerCallId: identity.CallSid,
      providerDialCallId: identity.DialCallSid,
      status: "completed",
      durationSeconds: null,
      bridged: null,
    },
  });
  persist.mockReset().mockResolvedValue(17);
});
afterAll(() => {
  process.env.TWILIO_AUTH_TOKEN = original;
});
test.each(["no-answer", "busy", "failed", "canceled"])(
  "%s transfer explains failure and ends without redial",
  async (status) => {
    const response = await POST(
      request({
        CallStatus: "in-progress",
        DialCallStatus: status,
        ErrorMessage: "private",
      }),
    );
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Matrx-Transfer-Receipt-State")).toBe(
      "consistent",
    );
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCallId: identity.CallSid,
        providerDialCallId: identity.DialCallSid,
        status,
      }),
    );
    expect(xml).toContain("could not reach a person");
    expect(xml).toContain("<Hangup/>");
    expect(xml).not.toContain("<Dial");
    expect(xml).not.toContain("private");
  },
);
test.each([
  { CallStatus: "completed", DialCallStatus: "no-answer" },
  { CallStatus: "in-progress", DialCallStatus: "completed" },
])("answered or hung-up call stays silent", async (params) => {
  const xml = await (await POST(request(params))).text();
  expect(xml).not.toContain("<Say");
  expect(xml).toContain("<Hangup/>");
});
test("forged result is refused", async () => {
  const response = await POST(request({ DialCallStatus: "no-answer" }, true));
  expect(response.status).toBe(403);
  expect(response.headers.has("X-Matrx-Transfer-Receipt-State")).toBe(false);
  expect(readReceipt).not.toHaveBeenCalled();
});

test("invalid evidence never reaches persistence", async () => {
  const response = await POST(request({ DialCallStatus: "unknown" }));
  expect(response.status).toBe(400);
  expect(response.headers.has("X-Matrx-Transfer-Receipt-State")).toBe(false);
  expect(readReceipt).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
});
test("durable write failure never acknowledges a callback", async () => {
  persist.mockRejectedValue(new Error("private database detail"));
  const response = await POST(request({ DialCallStatus: "completed" }));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private");
});
test("caller continuation waits for the durable event", async () => {
  let acknowledge!: (id: number) => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  persist.mockImplementation(
    () =>
      new Promise<number>((resolve) => {
        acknowledge = resolve;
        entered();
      }),
  );
  let returned = false;
  const pending = POST(request({ DialCallStatus: "completed" })).then(
    (response) => {
      returned = true;
      return response;
    },
  );
  await started;
  expect(returned).toBe(false);
  acknowledge(17);
  expect((await pending).status).toBe(200);
});

test("conflicting evidence gives an honest ending without redial", async () => {
  readReceipt.mockResolvedValue({
    state: "conflict",
    deliveryCount: 2,
    firstEventId: 16,
    lastEventId: 17,
  });
  const response = await POST(request({ DialCallStatus: "completed" }));
  expect(response.headers.get("X-Matrx-Transfer-Receipt-State")).toBe(
    "conflict",
  );
  const xml = await response.text();
  expect(xml).toContain("could not confirm");
  expect(xml).not.toContain("<Dial");
  expect(xml).toContain("<Hangup/>");
  expect(readReceipt).toHaveBeenCalledWith(
    expect.objectContaining({ providerDialCallId: identity.DialCallSid }),
    17,
  );
});
test("unavailable projection is not acknowledged", async () => {
  readReceipt.mockRejectedValue(Error("private"));
  const response = await POST(request({ DialCallStatus: "completed" }));
  expect(response.status).toBe(503);
  expect(response.headers.has("X-Matrx-Transfer-Receipt-State")).toBe(false);
});
test("completed caller stays silent on conflict", async () => {
  readReceipt.mockResolvedValue({
    state: "conflict",
    deliveryCount: 2,
    firstEventId: 16,
    lastEventId: 17,
  });
  expect(
    await (
      await POST(
        request({ DialCallStatus: "completed", CallStatus: "completed" }),
      )
    ).text(),
  ).not.toContain("<Say");
});
