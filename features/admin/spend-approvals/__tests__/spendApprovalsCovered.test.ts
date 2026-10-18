/**
 * A waiting record that the agent's owner decision covers is covered and is waiting nowhere
 * (adversarial review 2026-10-18 follow-up). Break named: a covered record counted or filtered as plain waiting.
 */
import { COVERED_LABEL, isCovered, isWaiting } from "../coveredApprovals";

const rows = [
  { id: "c", status: "waiting", covered_by_id: "owner-1" },
  { id: "w", status: "waiting", covered_by_id: null },
  { id: "a", status: "approved", covered_by_id: null },
  { id: "r", status: "rejected", covered_by_id: "owner-1" },
];

test("a covered waiting record is covered, not waiting; a plain waiting one still waits", () => {
  expect(rows.filter(isWaiting).map((r) => r.id)).toEqual(["w"]);
  expect(rows.filter(isCovered).map((r) => r.id)).toEqual(["c"]);
});

test("a decided record is never covered, even if a stale cover id rides along", () => {
  expect(isCovered(rows[3])).toBe(false);
  expect(isWaiting(rows[2])).toBe(false);
});

test("the label says whose decision covers it", () => {
  expect(COVERED_LABEL).toMatch(/agent/);
});
