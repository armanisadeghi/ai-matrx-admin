/**
 * Review 3 (2026-10-19): N5 — one failed triage poll keeps the last good card (never unsorted alarms);
 * N6 — grouped approval actions act only on the status the card showed, and lapsed approvals offer one
 * "Approve again". SUT: `triageStatus`, `spendAlarmItems`, `decideGroup` (the decide door is doubled).
 */

jest.mock("@/features/admin/spend-approvals/spendApprovals", () => {
  class ApprovalDecidedSinceError extends Error {}
  return { decideSpendApproval: jest.fn(), restoreOwnerApproval: jest.fn(), ApprovalDecidedSinceError };
});

import { triageStatus } from "../sources/useAttentionTriage";
import { spendAlarmItems, type SpendAlarmDeps } from "../sources/spend-alarms";
import { decideGroup } from "../sources/useSpendAlarmSource";
import { ApprovalDecidedSinceError, decideSpendApproval } from "@/features/admin/spend-approvals/spendApprovals";
import type { SpendAlarmAttentionRow } from "@/features/admin/spend-alarms/spendAlarms";

const A = "9a0b1c2d-2222-4e3f-9a00-00000000bb02";
const B = "7f3e2a10-1111-4b2c-8d00-00000000aa01";

describe("triage status (N5)", () => {
  it("a failed refetch over a good cached card stays ok; only no card at all is failed", () => {
    expect(triageStatus(true, true, true)).toBe("ok");
    expect(triageStatus(true, true, false)).toBe("failed");
    expect(triageStatus(true, false, false)).toBe("loading");
    expect(triageStatus(false, true, true)).toBe("idle");
  });
});

function expired(): SpendAlarmAttentionRow {
  return {
    id: "c0ffee00-3333-4a4a-8b8b-00000000cc03",
    kind: "spend_approvals_expired",
    level: "warning",
    title: "2 approvals expired on Oct 21",
    detail: "General Chat and Kind Creator lost their temporary approval on Oct 21 and are rejected now, so their automated runs are held.",
    rule: null,
    fix: null,
    subject_type: "approvals",
    subject_id: "expired",
    subject_name: "Expired approvals",
    refs: { approval_ids: `${A},${B}`, approval_count: "2", extend_to: "2026-11-20T09:00:00+00:00" },
    occurrence_count: 1,
    first_seen_at: "2026-10-21T07:00:00Z",
    last_seen_at: "2026-10-21T07:00:00Z",
    cost_usd: null,
    cost_avoided_usd: null,
    status: "open",
    snoozed_until: null,
    resolved_at: null,
  } as unknown as SpendAlarmAttentionRow;
}

describe("approval groups (N6)", () => {
  it("lapsed approvals offer one Approve again that re-approves every id until the date", async () => {
    const calls: unknown[][] = [];
    const deps = {
      setStatus: async () => {},
      decideApproval: async () => {},
      setTaskEnabled: async () => {},
      runTaskNow: async () => {},
      reapproveApprovals: async (...args: unknown[]) => void calls.push(args),
      now: Date.parse("2026-10-21T08:00:00Z"),
    } as unknown as SpendAlarmDeps;
    const [item] = spendAlarmItems([expired()], deps);
    const again = item.actions.find((a) => a.id === "reapprove_approvals");
    expect(again?.label).toBe("Approve again");
    await again!.run();
    expect(calls).toEqual([[[A, B], "2026-11-20T09:00:00+00:00"]]);
  });

  it("Extend passes the status the card showed, and says what it left alone", async () => {
    const decide = decideSpendApproval as jest.Mock;
    decide.mockReset();
    decide.mockImplementation(async (id: string) => {
      if (id === B) throw new ApprovalDecidedSinceError("Not changed: Kind Creator is now rejected, not temporary");
    });
    await expect(decideGroup([A, B], "2026-11-20T09:00:00+00:00", "temporary")).rejects.toThrow(/1 of 2 done; 1 left as they are/);
    expect(decide).toHaveBeenCalledWith(A, "approve_temporary", { expiresAt: "2026-11-20T09:00:00+00:00", expectedStatus: "temporary" });
    decide.mockReset();
    decide.mockResolvedValue(undefined);
    await expect(decideGroup([A], "2026-11-20T09:00:00+00:00", "rejected")).resolves.toBeUndefined();
    expect(decide).toHaveBeenCalledWith(A, "approve_temporary", { expiresAt: "2026-11-20T09:00:00+00:00", expectedStatus: "rejected" });
  });

  it("a failure that is not the stale-status refusal is said with its own reason, never as 'decided since' (2026-10-21)", async () => {
    const decide = decideSpendApproval as jest.Mock;
    decide.mockReset();
    decide.mockRejectedValue(new Error("canceling statement due to statement timeout — (code: 57014)"));
    const err = await decideGroup([A, B], "2026-11-20T09:00:00+00:00", "temporary").catch((e: Error) => e);
    expect(String(err)).toMatch(/0 of 2 done; 2 failed: canceling statement due to statement timeout/);
    expect(String(err)).not.toMatch(/decided/);
    decide.mockReset();
    decide.mockImplementation(async (id: string) => {
      if (id === A) throw new ApprovalDecidedSinceError("Not changed");
      throw new Error("Could not query the database for the schema cache. Retrying.");
    });
    await expect(decideGroup([A, B], "2026-11-20T09:00:00+00:00", "temporary")).rejects.toThrow(
      "0 of 2 done; 1 left as they are because someone decided it since; 1 failed: Could not query the database for the schema cache. Retrying.",
    );
  });
});
