jest.mock("server-only", () => ({}), { virtual: true });
import { recordVoiceTransferResultObservation } from "./transfer-result-persistence";
import { createAdminClient } from "@/utils/supabase/adminClient";
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: jest.fn(),
}));
const single = jest.fn(),
  rpc = jest.fn();
const query = { select: jest.fn(), eq: jest.fn(), is: jest.fn(), single };
const from = jest.fn(() => query),
  schema = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  single.mockResolvedValue({
    data: { id: "parent", organization_id: "org" },
    error: null,
  });
  rpc.mockResolvedValue({ data: 9, error: null });
  schema.mockReturnValue({ from, rpc });
  jest
    .mocked(createAdminClient)
    .mockReturnValue({ schema } as unknown as ReturnType<
      typeof createAdminClient
    >);
});
const result = {
  providerAccountId: "account",
  providerCallId: "parent-call",
  providerDialCallId: "child-call",
  status: "busy" as const,
  durationSeconds: 0,
  bridged: false,
};
test("correlates exact parent and appends only bounded provider evidence", async () => {
  expect(await recordVoiceTransferResultObservation(result)).toBe(9);
  expect(query.eq.mock.calls).toEqual([
    ["channel_code", "call"],
    ["provider", "twilio"],
    ["provider_account_id", "account"],
    ["provider_interaction_id", "parent-call"],
  ]);
  expect(query.is).toHaveBeenCalledWith("deleted_at", null);
  expect(rpc).toHaveBeenCalledWith(
    "log_activity",
    expect.objectContaining({
      p_org: "org",
      p_entity_id: "parent",
      p_action: "voice.call.transfer_result.observed",
      p_metadata: expect.objectContaining({
        status: "busy",
        bridged: false,
        duration_seconds: 0,
      }),
    }),
  );
  expect(schema.mock.calls).toEqual([["crm"], ["platform"]]);
});
test("missing or ambiguous parent does not append", async () => {
  single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
  await expect(recordVoiceTransferResultObservation(result)).rejects.toThrow(
    "exact canonical parent",
  );
  expect(rpc).not.toHaveBeenCalled();
});
test.each([
  { data: null, error: { code: "42501" } },
  { data: null, error: null },
  { data: 0, error: null },
])("failed durable append is rejected %o", async (reply) => {
  rpc.mockResolvedValue(reply);
  await expect(recordVoiceTransferResultObservation(result)).rejects.toThrow(
    "not durably recorded",
  );
});
