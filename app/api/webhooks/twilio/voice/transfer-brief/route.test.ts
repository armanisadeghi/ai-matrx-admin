/** @jest-environment node */
import twilio from "twilio";
import { POST } from "./route";
import { readTransferWorkSummary } from "@/lib/communications/voice/transfer-work-summary";
jest.mock("@/lib/communications/voice/transfer-work-summary", () => ({
  readTransferWorkSummary: jest.fn(),
}));
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({ fixture: true }),
}));
const original = process.env.TWILIO_AUTH_TOKEN;
const token = "receiver-brief-fixture";
function request(
  query: string,
  forged = false,
  extra: Record<string, string> = {},
) {
  const url =
    "https://www.aimatrx.com/api/webhooks/twilio/voice/transfer-brief" + query;
  const params = {
    CallSid: "fixture",
    From: "+19497027626",
    To: "+19498072145",
    Summary: "private",
    ...extra,
  };
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
  jest.mocked(readTransferWorkSummary).mockReset();
  process.env.TWILIO_AUTH_TOKEN = token;
});
afterAll(() => {
  process.env.TWILIO_AUTH_TOKEN = original;
});
test("signed receiver brief speaks bounded facts without ending or redialing", async () => {
  const response = await POST(request("?agentRequests=3&interruptions=1"));
  const xml = await response.text();
  expect(response.status).toBe(200);
  expect(xml).toContain("started 3 responses");
  expect(xml).toContain("was 1 interruption");
  expect(xml).toContain("Connecting you now");
  expect(xml).not.toMatch(/private|<Hangup|<Dial/);
});
test.each([
  "",
  "?agentRequests=-1&interruptions=1",
  "?agentRequests=501&interruptions=0",
  "?agentRequests=1&interruptions=501",
  "?agentRequests=1.5&interruptions=0",
])("%s malformed counts get generic introduction", async (query) => {
  const xml = await (await POST(request(query))).text();
  expect(xml).toContain("requested to speak to a person");
  expect(xml).not.toContain("started");
  expect(xml).not.toContain("<Hangup");
});
test("signature covers query counts", async () => {
  expect(
    (await POST(request("?agentRequests=3&interruptions=1", true))).status,
  ).toBe(403);
});

const parentIdentity = {
  AccountSid: "AC" + "1".repeat(32),
  ParentCallSid: "CA" + "2".repeat(32),
};
test("signed parent identity selects saved work, never the child call or URL data", async () => {
  jest
    .mocked(readTransferWorkSummary)
    .mockResolvedValue({
      requests: 3,
      completed: 1,
      failed: 1,
      unfinished: 1,
      toolCalls: 3,
    });
  const response = await POST(
    request("?summary=private", false, parentIdentity),
  );
  const xml = await response.text();
  expect(readTransferWorkSummary).toHaveBeenCalledWith(
    expect.anything(),
    parentIdentity.AccountSid,
    parentIdentity.ParentCallSid,
  );
  expect(xml).toContain(
    "1 completed agent requests, 1 failed, and 1 not confirmed complete",
  );
  expect(xml).toContain("3 tool call attempts");
  expect(xml).not.toMatch(/private|<Hangup|<Dial/);
});
test("a child SID never substitutes for an absent parent", async () => {
  await POST(
    request("", false, {
      AccountSid: parentIdentity.AccountSid,
      CallSid: parentIdentity.ParentCallSid,
    }),
  );
  expect(readTransferWorkSummary).not.toHaveBeenCalled();
});
test("unavailable saved work preserves the receiver bridge introduction", async () => {
  jest
    .mocked(readTransferWorkSummary)
    .mockRejectedValue(Error("private database detail"));
  const response = await POST(request("", false, parentIdentity));
  const xml = await response.text();
  expect(response.status).toBe(200);
  expect(xml).toContain("Connecting you now");
  expect(xml).not.toMatch(/private|Saved work|<Hangup|<Dial/);
});
