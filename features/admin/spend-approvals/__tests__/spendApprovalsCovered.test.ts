/**
 * A waiting record that the agent's owner decision covers is shown as covered and is waiting nowhere
 * (adversarial review 2026-10-18 follow-up).
 *
 * Breaks named: the list treating a covered record as plain waiting (counts, KPIs, the Waiting filter);
 * the covered columns of run_approval_list dropped by the row mapping.
 */
type Result = { data: unknown; error: unknown };
const rpc = jest.fn<Promise<Result>, [string, unknown]>();

function query() {
  const chain = { select: () => chain, in: () => chain, is: () => chain, order: () => chain, then: (resolve: (r: Result) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve) };
  return chain;
}

jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: () => ({ rpc: (fn: string, args: unknown) => rpc(fn, args), from: () => query() }) },
}));

import { fetchSpendApprovals, isCovered, isWaiting } from "../spendApprovals";

const base = { first_run_cost: 2, first_run_models: [], status: "waiting", subject_kind: "mandate", agent_id: null, mandate_key: null };

test("a covered waiting record is covered, not waiting; a plain waiting one still waits", async () => {
  rpc.mockImplementation(async (fn) =>
    fn === "run_approval_list"
      ? {
          data: [
            { ...base, id: "c", subject_id: "chat.default_new_chat", covered_by_id: "owner-1", covered_by_status: "approved", covered_by_subject_kind: "agent" },
            { ...base, id: "w", subject_id: "seo.lone", covered_by_id: null, covered_by_status: null, covered_by_subject_kind: null },
          ],
          error: null,
        }
      : { data: [], error: null },
  );
  const rows = await fetchSpendApprovals(null);
  const covered = rows.find((r) => r.id === "c")!;
  const plain = rows.find((r) => r.id === "w")!;
  expect(covered.covered_by_status).toBe("approved");
  expect(isCovered(covered)).toBe(true);
  expect(isWaiting(covered)).toBe(false);
  expect(isWaiting(plain)).toBe(true);
  expect(isCovered(plain)).toBe(false);
  expect(rows.filter(isWaiting).map((r) => r.id)).toEqual(["w"]);
});

test("an approved or rejected record is never covered", () => {
  expect(isCovered({ status: "approved", covered_by_id: "x" })).toBe(false);
  expect(isCovered({ status: "rejected", covered_by_id: "x" })).toBe(false);
});
