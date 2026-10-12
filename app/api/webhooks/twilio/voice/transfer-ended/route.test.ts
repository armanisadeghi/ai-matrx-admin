/** @jest-environment node */
import twilio from "twilio";
import { POST } from "./route";
import { recordVoiceTransferResultObservation } from "@/lib/communications/voice/transfer-result-persistence";
jest.mock("@/lib/communications/voice/transfer-result-persistence", () => ({
  recordVoiceTransferResultObservation: jest.fn(),
}));
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
  expect(
    (await POST(request({ DialCallStatus: "no-answer" }, true))).status,
  ).toBe(403);
});

test("invalid evidence never reaches persistence", async () => {
  expect((await POST(request({ DialCallStatus: "unknown" }))).status).toBe(400);
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
