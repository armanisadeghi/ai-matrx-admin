import { loadTransferReceipt } from "./transfer-receipt-service";
import { contextFixture } from "./__tests__/transfer-context-fixture";

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => mockClient,
}));
const f = contextFixture();
const resultMetadata = {
  provider: "twilio",
  provider_account_id: f.call.provider_account_id,
  provider_call_id: f.call.provider_interaction_id,
  provider_dial_call_id: "CA" + "a".repeat(32),
  provider_event_key: `twilio:${f.call.provider_account_id}:CA${"a".repeat(32)}`,
  status: "completed",
  duration_seconds: 12,
  bridged: true,
};
const event = { ...f.observation, metadata: resultMetadata };
function query() {
  const q: Record<
    | "select"
    | "eq"
    | "contains"
    | "order"
    | "limit"
    | "abortSignal"
    | "maybeSingle",
    jest.Mock
  > = {
    select: jest.fn(),
    eq: jest.fn(),
    contains: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    abortSignal: jest.fn(),
    maybeSingle: jest.fn(),
  };
  Object.values(q).forEach((method) => method.mockReturnValue(q));
  return q;
}
let seed = query(),
  snapshot = query(),
  parent = query(),
  admin = true,
  platformReads = 0;
const mockClient = {
  rpc: () => ({ abortSignal: async () => ({ data: admin, error: null }) }),
  schema: (schema: string) => ({
    from: () =>
      schema === "platform"
        ? platformReads++ === 0
          ? seed
          : snapshot
        : parent,
  }),
};
beforeEach(() => {
  seed = query();
  snapshot = query();
  parent = query();
  admin = true;
  platformReads = 0;
  seed.maybeSingle.mockResolvedValue({ data: event, error: null });
  snapshot.limit.mockResolvedValue({
    data: [event, { ...event, id: 2 }],
    count: 2,
    error: null,
  });
  parent.maybeSingle.mockResolvedValue({ data: f.call, error: null });
});
test("exact seed expands globally beyond the recent parent window and counts replay once per delivery", async () => {
  expect(await loadTransferReceipt(event.id, f.call.id)).toMatchObject({
    state: "consistent",
    connection: "connected",
    deliveryCount: 2,
  });
  expect(seed.eq).toHaveBeenCalledWith("entity_id", f.call.id);
  expect(snapshot.eq.mock.calls).toEqual([
    ["action", "voice.call.transfer_result.observed"],
  ]);
  expect(snapshot.contains).toHaveBeenCalledWith("metadata", {
    provider_account_id: resultMetadata.provider_account_id,
    provider_dial_call_id: resultMetadata.provider_dial_call_id,
  });
  expect(snapshot.select).toHaveBeenCalledWith(expect.any(String), {
    count: "exact",
  });
  expect(snapshot.limit).toHaveBeenCalledWith(1000);
  expect(snapshot.abortSignal).toHaveBeenCalled();
  expect(parent.eq.mock.calls).toEqual([["id", f.call.id]]);
});
test("older contradictory parent and result claims remain conflict, even outside recent callbacks", async () => {
  snapshot.limit.mockResolvedValue({
    data: [event, { ...event, id: 2, entity_id: contextFixture(2).call.id }],
    count: 2,
    error: null,
  });
  expect((await loadTransferReceipt(event.id, f.call.id)).state).toBe(
    "conflict",
  );
});
test.each([
  { data: [event], count: null, error: null },
  { data: [event], count: 2, error: null },
  { data: [event], count: 1001, error: null },
  { data: [{ ...event, id: 99 }], count: 1, error: null },
  { data: null, count: null, error: { code: "42501" } },
])(
  "incomplete or unavailable evidence cannot become an operator result: %o",
  async (reply) => {
    snapshot.limit.mockResolvedValue(reply);
    await expect(loadTransferReceipt(event.id, f.call.id)).rejects.toThrow();
  },
);
test("a retired exact parent remains evidence; a changed parent attribution conflicts", async () => {
  parent.maybeSingle.mockResolvedValue({
    data: { ...f.call, deleted_at: "2026-10-18T12:00:00Z" },
    error: null,
  });
  expect((await loadTransferReceipt(event.id, f.call.id)).state).toBe(
    "consistent",
  );
  parent.maybeSingle.mockResolvedValue({
    data: { ...f.call, provider_interaction_id: "CA" + "b".repeat(32) },
    error: null,
  });
  platformReads = 0;
  expect((await loadTransferReceipt(event.id, f.call.id)).state).toBe(
    "conflict",
  );
});
test("selected event cannot be substituted for another call or malformed metadata", async () => {
  seed.maybeSingle.mockResolvedValue({
    data: { ...event, entity_id: contextFixture(2).call.id },
    error: null,
  });
  await expect(loadTransferReceipt(event.id, f.call.id)).rejects.toThrow(
    "unavailable",
  );
  platformReads = 0;
  seed.maybeSingle.mockResolvedValue({
    data: { ...event, metadata: { ...resultMetadata, bridged: "true" } },
    error: null,
  });
  await expect(loadTransferReceipt(event.id, f.call.id)).rejects.toThrow(
    "could not be read",
  );
  expect(snapshot.limit).not.toHaveBeenCalled();
});
test("non-admin never reads evidence", async () => {
  admin = false;
  await expect(loadTransferReceipt(event.id, f.call.id)).rejects.toThrow(
    "administrator",
  );
  expect(platformReads).toBe(0);
});
