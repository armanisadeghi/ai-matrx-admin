// The maintainer's tools (named for the Start page they began on) drive a launchpad through the same verbs.
import { applyAgentEdit, catalogForAgent, readForAgent } from "../tools/agentEdits";
import { EMPTY_LAUNCHPAD_DOC } from "../doc";

it("adds, configures, moves, resizes and removes through the doc verbs", () => {
  let doc = EMPTY_LAUNCHPAD_DOC;
  const add = applyAgentEdit(doc, "start_add_widget", { type: "tasks", size: "s" });
  if (!add.ok) throw new Error(add.error);
  doc = add.doc;
  const id = add.result.id as string;
  expect(readForAgent(doc, 1).widgets[0]).toMatchObject({ id, type: "tasks", size: "s", w: 3 });
  const second = applyAgentEdit(doc, "start_add_widget", { type: "recent", config: { kind: "note" }, position: 0 });
  if (!second.ok) throw new Error(second.error);
  doc = second.doc;
  expect(readForAgent(doc, 2).widgets[0]!.type).toBe("recent");
  const resized = applyAgentEdit(doc, "start_resize_widget", { id, w: 12, h: 14 });
  if (!resized.ok) throw new Error(resized.error);
  expect(resized.result).toMatchObject({ size: "l", w: 12, h: 14 });
  const moved = applyAgentEdit(resized.doc, "start_move_widget", { id, position: 0 });
  expect(moved.ok && readForAgent(moved.doc, 0).widgets[0]!.id).toBe(id);
  const removed = applyAgentEdit(resized.doc, "start_remove_widget", { id });
  expect(removed.ok && removed.doc.widgets.length).toBe(1);
});

it("refuses by name: unknown type, bad size, unknown field, bad choice, missing widget", () => {
  expect(applyAgentEdit(EMPTY_LAUNCHPAD_DOC, "start_add_widget", { type: "nope" }).ok).toBe(false);
  expect(applyAgentEdit(EMPTY_LAUNCHPAD_DOC, "start_add_widget", { type: "kpis", size: "s" })).toEqual({ ok: false, error: '"kpis" is 6 to 12 columns wide.' });
  expect(applyAgentEdit(EMPTY_LAUNCHPAD_DOC, "start_add_widget", { type: "recent", config: { color: "red" } }).ok).toBe(false);
  expect(applyAgentEdit(EMPTY_LAUNCHPAD_DOC, "start_add_widget", { type: "recent", config: { kind: "boats" } }).ok).toBe(false);
  expect(applyAgentEdit(EMPTY_LAUNCHPAD_DOC, "start_remove_widget", { id: "x" }).ok).toBe(false);
});

it("lists every widget with its sizes and grid limits", () => {
  const kpis = catalogForAgent().find((c) => c.type === "kpis")!;
  expect(kpis.sizes).toEqual(["m", "l"]);
  expect(kpis.grid.minW).toBe(6);
});
