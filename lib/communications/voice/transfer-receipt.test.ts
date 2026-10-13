import {
  projectVoiceTransferReceipt,
  type TransferObservation,
} from "./transfer-receipt";
const result = {
  providerAccountId: "AC" + "1".repeat(32),
  providerCallId: "CA" + "2".repeat(32),
  providerDialCallId: "CA" + "3".repeat(32),
  status: "completed" as const,
  durationSeconds: 12,
  bridged: true,
};
const row: TransferObservation = {
  id: 1,
  entity_type: "crm_interaction",
  entity_id: "parent",
  organization_id: "org",
  metadata: {
    provider: "twilio",
    provider_account_id: result.providerAccountId,
    provider_call_id: result.providerCallId,
    provider_dial_call_id: result.providerDialCallId,
    provider_event_key: `twilio:${result.providerAccountId}:${result.providerDialCallId}`,
    status: result.status,
    duration_seconds: 12,
    bridged: true,
  },
};
test("replays yield one receipt and preserve evidence bounds", () => {
  expect(
    projectVoiceTransferReceipt([row, { ...row, id: 3 }], result, 3),
  ).toMatchObject({
    state: "consistent",
    deliveryCount: 2,
    firstEventId: 1,
    lastEventId: 3,
    connection: "connected",
    result,
  });
});
test.each([
  { status: "failed" },
  { duration_seconds: 13 },
  { bridged: false },
  { provider_call_id: "CA" + "4".repeat(32) },
])("contradictory evidence %o stays a conflict", (change) => {
  expect(
    projectVoiceTransferReceipt(
      [
        row,
        { ...row, id: 2, metadata: { ...(row.metadata as object), ...change } },
      ],
      result,
      2,
    ).state,
  ).toBe("conflict");
});
test.each([{ entity_id: "other" }, { organization_id: "other" }])(
  "parent attribution conflict %o cannot be filtered away",
  (change) => {
    expect(
      projectVoiceTransferReceipt(
        [row, { ...row, id: 2, ...change }],
        result,
        2,
      ).state,
    ).toBe("conflict");
  },
);
test.each([null, false])(
  "completed with bridge %s never claims connected",
  (bridged) => {
    const changed = {
      ...row,
      metadata: { ...(row.metadata as object), bridged },
    };
    expect(
      projectVoiceTransferReceipt([changed], { ...result, bridged }, 1),
    ).toMatchObject({
      connection: bridged === false ? "not-connected" : "unknown",
    });
  },
);
test.each(
  [[], [{ ...row, id: 2 }], Array(1001).fill(row)].map((rows) => ({ rows })),
)("incomplete or malformed evidence is unavailable", ({ rows }) => {
  expect(() => projectVoiceTransferReceipt(rows, result, 1)).toThrow();
});

test.each([{ metadata: null }, { entity_id: null }])(
  "malformed ledger %o is conflict",
  (change) => {
    expect(
      projectVoiceTransferReceipt([{ ...row, ...change }], result, 1).state,
    ).toBe("conflict");
  },
);
