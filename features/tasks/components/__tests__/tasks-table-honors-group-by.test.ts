/**
 * THE TABLE GROUPS AS THE SIDEBAR SAYS (live walk 2026-10-22, /tasks): "Group: Project" in the
 * sidebar must draw task rows under collapsible project bands (the table's `grouping`), not a drill
 * rollup. The drill stays in the table's own Group-by menu (TASKS_DRILL starts flat).
 */
import { TASKS_DRILL } from "../tasksDrill";
import {
  TASK_GROUP_PARAM,
  groupByFromParam,
  groupByToColumnId,
  columnIdToGroupBy,
  taskBandKey,
  taskBandLabel,
} from "../tasksGrouping";

const task = (over: Record<string, unknown>) => ({ id: "t", priority: null, status: "todo", dueDate: null, completed: false, ...over }) as never;

describe("sidebar Group drives table grouping bands", () => {
  it("the drill no longer starts grouped", () => {
    expect(TASKS_DRILL.question).toBeUndefined();
  });
  it.each([
    ["project", "project"],
    ["status", "status"],
    ["priority", "priority"],
    ["dueDate", "dueDate"],
    ["scope", null],
    ["none", null],
  ] as const)("%s maps to column %s", (g, col) => {
    expect(groupByToColumnId(g)).toBe(col);
  });
  it("round-trips the table's own Group menu back to the sidebar choice", () => {
    expect(columnIdToGroupBy("priority")).toBe("priority");
    expect(columnIdToGroupBy(null)).toBe("none");
    expect(columnIdToGroupBy("labels")).toBeUndefined();
  });
  it("keeps the choice in the address", () => {
    expect(TASK_GROUP_PARAM).toBe("group");
    expect(groupByFromParam("status")).toBe("status");
    expect(groupByFromParam("none")).toBe("none");
    expect(groupByFromParam("bogus")).toBeUndefined();
    expect(groupByFromParam(null)).toBeUndefined();
  });
  it("orders and labels bands the way the list view does", () => {
    const today = "2026-10-22";
    const hi = taskBandKey("priority", task({ priority: "high" }), today);
    const lo = taskBandKey("priority", task({ priority: "low" }), today);
    const none = taskBandKey("priority", task({}), today);
    expect([none, lo, hi].sort()).toEqual([hi, lo, none]);
    expect(taskBandLabel("priority", hi)).toBe("High");
    expect(taskBandLabel("priority", none)).toBe("No priority");
    const od = taskBandKey("dueDate", task({ dueDate: "2026-10-01" }), today);
    const td = taskBandKey("dueDate", task({ dueDate: today }), today);
    const nd = taskBandKey("dueDate", task({}), today);
    expect([nd, td, od].sort()).toEqual([od, td, nd]);
    expect(taskBandLabel("dueDate", od)).toBe("Overdue");
    expect(taskBandLabel("dueDate", nd)).toBe("No due date");
    expect(taskBandLabel("status", taskBandKey("status", task({ status: "todo" }), today))).toBeTruthy();
  });
});
