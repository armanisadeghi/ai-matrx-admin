jest.mock("server-only", () => ({}), { virtual: true });
import { createAdminClient } from "@/utils/supabase/adminClient";
import { readVoiceTransferReceipt } from "./transfer-receipt-persistence";
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: jest.fn(),
}));
const result = {
  providerAccountId: "AC" + "1".repeat(32),
  providerCallId: "CA" + "2".repeat(32),
  providerDialCallId: "CA" + "3".repeat(32),
  status: "completed" as const,
  durationSeconds: 12,
  bridged: true,
};
const row = {
  id: 17,
  entity_type: "crm_interaction",
  entity_id: "parent",
  organization_id: "org",
  metadata: {
    provider: "twilio",
    provider_account_id: result.providerAccountId,
    provider_call_id: result.providerCallId,
    provider_dial_call_id: result.providerDialCallId,
    provider_event_key: `twilio:${result.providerAccountId}:${result.providerDialCallId}`,
    status: "completed",
    duration_seconds: 12,
    bridged: true,
  },
};
const limit = jest.fn(),
  maybeSingle = jest.fn();
const ledger = {
  select: jest.fn(),
  eq: jest.fn(),
  contains: jest.fn(),
  order: jest.fn(),
  limit,
};
const parent = { select: jest.fn(), eq: jest.fn(), maybeSingle };
const schema = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  for (const method of [
    ledger.select,
    ledger.eq,
    ledger.contains,
    ledger.order,
  ])
    method.mockReturnValue(ledger);
  parent.select.mockReturnValue(parent);
  parent.eq.mockReturnValue(parent);
  limit.mockResolvedValue({ data: [row], error: null, count: 1 });
  maybeSingle.mockResolvedValue({
    data: {
      channel_code: "call",
      provider: "twilio",
      provider_account_id: result.providerAccountId,
      provider_interaction_id: result.providerCallId,
      organization_id: "org",
    },
    error: null,
  });
  schema.mockImplementation((name) => ({
    from: () => (name === "platform" ? ledger : parent),
  }));
  jest
    .mocked(createAdminClient)
    .mockReturnValue({ schema } as unknown as ReturnType<
      typeof createAdminClient
    >);
});
test("global child projection validates historical parent", async () => {
  expect(await readVoiceTransferReceipt(result, 17)).toMatchObject({
    state: "consistent",
    connection: "connected",
  });
  expect(ledger.select).toHaveBeenCalledWith(
    "id,entity_type,entity_id,organization_id,metadata",
    { count: "exact" },
  );
  expect(ledger.contains).toHaveBeenCalledWith("metadata", {
    provider_account_id: result.providerAccountId,
    provider_dial_call_id: result.providerDialCallId,
  });
  expect(ledger.eq.mock.calls).toEqual([
    ["action", "voice.call.transfer_result.observed"],
  ]);
  expect(limit).toHaveBeenCalledWith(1000);
  expect(parent.eq.mock.calls).toEqual([["id", "parent"]]);
});
test.each([
  { data: [row], error: null, count: 1001 },
  { data: [row], error: null, count: 2 },
  { data: [row], error: null, count: null },
  { data: null, error: { code: "42501" }, count: null },
  { data: [{ ...row, id: 18 }], error: null, count: 1 },
])("unavailable snapshot %o never becomes a receipt", async (reply) => {
  limit.mockResolvedValue(reply);
  await expect(readVoiceTransferReceipt(result, 17)).rejects.toThrow();
});
test.each([
  null,
  { channel_code: "sms" },
  { provider: "other" },
  { provider_account_id: "other" },
  { provider_interaction_id: "other" },
  { organization_id: "other" },
])("missing or inconsistent historical parent %o conflicts", async (change) => {
  const original = (await maybeSingle()).data;
  maybeSingle.mockResolvedValue({
    data: change === null ? null : { ...original, ...change },
    error: null,
  });
  expect((await readVoiceTransferReceipt(result, 17)).state).toBe("conflict");
});
test("database parent read failure remains unavailable", async () => {
  maybeSingle.mockResolvedValue({ data: null, error: { code: "42501" } });
  await expect(readVoiceTransferReceipt(result, 17)).rejects.toThrow(
    "validation unavailable",
  );
});
