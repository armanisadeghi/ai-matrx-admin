/**
 * THE TABLE GROUPS AS THE SIDEBAR SAYS (live walk 2026-10-22, /tasks member): "Group: Project" was
 * highlighted in the sidebar while the table drew flat rows — the table view never read the
 * sidebar's group-by. Its drill now starts grouped by the same field (Due by month; Scope and Flat
 * stay flat: the table has no scope Dimension).
 */
import { TASKS_DRILL, tasksDrillFor } from "../tasksDrill";

describe("the task table starts grouped by the sidebar's choice", () => {
  it.each([
    ["project", ["project"]],
    ["status", ["status"]],
    ["priority", ["priority"]],
    ["dueDate", ["dueDate:month"]],
  ] as const)("%s groups the table by %j", (groupBy, by) => {
    const drill = tasksDrillFor(groupBy);
    expect(drill.question?.by).toEqual(by);
    expect(drill.question?.show).toEqual(["count"]);
    expect(drill.dimensions).toEqual(TASKS_DRILL.dimensions);
  });
  it.each(["none", "scope"] as const)("%s leaves it flat", (groupBy) => {
    expect(tasksDrillFor(groupBy)).toBe(TASKS_DRILL);
  });
});
