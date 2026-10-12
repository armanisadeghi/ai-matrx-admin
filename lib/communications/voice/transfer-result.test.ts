import { parseVoiceTransferResult } from "./transfer-result";
const params = {
  AccountSid: "AC" + "1".repeat(32),
  CallSid: "CA" + "2".repeat(32),
  DialCallSid: "CA" + "3".repeat(32),
  DialCallStatus: "completed",
  DialCallDuration: "12",
  DialBridged: "true",
};
test("retains observed bridge and duration, without requiring them on a failed dial", () => {
  expect(parseVoiceTransferResult(params)).toEqual({
    providerAccountId: params.AccountSid,
    providerCallId: params.CallSid,
    providerDialCallId: params.DialCallSid,
    status: "completed",
    durationSeconds: 12,
    bridged: true,
  });
  expect(
    parseVoiceTransferResult({
      ...params,
      DialCallStatus: "busy",
      DialCallDuration: "0",
      DialBridged: "false",
    }),
  ).toMatchObject({ status: "busy", durationSeconds: 0, bridged: false });
  const absent = {
    AccountSid: params.AccountSid,
    CallSid: params.CallSid,
    DialCallSid: params.DialCallSid,
    DialCallStatus: "no-answer",
  };
  expect(parseVoiceTransferResult(absent)).toMatchObject({
    durationSeconds: null,
    bridged: null,
  });
});
test.each([
  { AccountSid: "ACwrong" },
  { DialCallSid: params.CallSid },
  { DialCallStatus: "answered" },
  { DialCallDuration: "-1" },
  { DialCallDuration: "1.5" },
  { DialCallDuration: "2147483648" },
  { DialBridged: "yes" },
])("rejects invalid Number-leg evidence %o", (override) => {
  expect(parseVoiceTransferResult({ ...params, ...override })).toBeNull();
});
