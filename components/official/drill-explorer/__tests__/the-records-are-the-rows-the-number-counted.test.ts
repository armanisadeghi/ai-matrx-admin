/** @jest-environment node */
// lane DRILL-NIGHT-RECORDS (live walk 2026-10-22): "See these records" lists exactly the rows the clicked
// number counted. Defect 3: /crm/deals "Qualified (2)" opened 0 deals — the records were asked for an
// "All time" window along Expected close (the definition's first time Dimension) that the number never
// had, so every deal with no expected close or a future one vanished. Defect 1: usage asked its number
// from the top of the hour but its records from the minute (1,418 requests vs 1,417).
import { recordsWindow, DRILL_ALL_TIME_FROM } from "../DrillRecords";

const CRM_DIMS = [
  { key: "stage", kind: "relation" },
  { key: "expected_close", kind: "time" },
  { key: "closed_at", kind: "time" },
  { key: "created_at", kind: "time" },
];
const USAGE_DIMS = [
  { key: "person", kind: "relation" },
  { key: "at", kind: "time" },
];
const NOW = new Date("2026-10-22T09:41:17.000Z");

describe("the records' window is the number's window", () => {
  it("an invoker definition asked for All time reads its records with no window at all", () => {
    expect(recordsWindow({ mode: "invoker" }, CRM_DIMS, null, null, undefined, NOW)).toBeUndefined();
  });

  it("a definer definition's records still get a start (the door requires one): the whole span", () => {
    expect(recordsWindow({ mode: "definer" }, USAGE_DIMS, null, null, undefined, NOW)).toEqual({ key: "at", from: DRILL_ALL_TIME_FROM, to: NOW.toISOString() });
  });

  it("a window the number was asked for is the records' window, cut to the hour as the number was", () => {
    const win = recordsWindow({ mode: "definer" }, USAGE_DIMS, null, "30d", "hour");
    expect(win?.key).toBe("at");
    expect(new Date(win!.from).getUTCMinutes()).toBe(0);
    expect(new Date(win!.from).getUTCSeconds()).toBe(0);
  });

  it("a definition with no time Dimension asks no window", () => {
    expect(recordsWindow({ mode: "definer" }, [{ key: "person", kind: "relation" }], null, "30d", "hour")).toBeUndefined();
  });
});
