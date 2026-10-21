/**
 * The decide door names exactly one refusal "decided since": the PT409 it raises when
 * p_expected_status no longer holds. A statement timeout or an unreachable schema cache stays a plain
 * Error with its own reason (2026-10-21: eight extensions failed during a database lock and the dock
 * said someone had decided them).
 */
const rpc = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: () => ({ rpc: (fn: string, args: unknown) => rpc(fn, args) }) },
}));

import { ApprovalDecidedSinceError, decideSpendApproval } from "../spendApprovals";

const ID = "aaaaaaaa-0000-4000-8000-000000000009";
const at = "2026-11-20T09:00:00+00:00";

beforeEach(() => rpc.mockReset());

it("PT409 with an expected status is the stale-card refusal", async () => {
  rpc.mockResolvedValue({ data: null, error: { code: "PT409", message: "Not changed: X is now rejected, not temporary", details: null, hint: null } });
  await expect(decideSpendApproval(ID, "approve_temporary", { expiresAt: at, expectedStatus: "temporary" })).rejects.toBeInstanceOf(ApprovalDecidedSinceError);
});

it.each([
  ["57014", "canceling statement due to statement timeout"],
  ["PGRST002", "Could not query the database for the schema cache. Retrying."],
  ["42501", "Forbidden: a platform admin decides this approval"],
  ["40001", "could not serialize access due to concurrent update"],
])("%s stays a plain error with its reason", async (code, message) => {
  rpc.mockResolvedValue({ data: null, error: { code, message, details: null, hint: null } });
  const err = await decideSpendApproval(ID, "approve_temporary", { expiresAt: at, expectedStatus: "temporary" }).catch((e: unknown) => e);
  expect(err).not.toBeInstanceOf(ApprovalDecidedSinceError);
  expect(String(err)).toContain(message);
});
