// The launchpad verbs: nothing is dropped on a round trip, a stored overlap draws clean, the Start page moves in
// with its widgets in the same order, and a new widget never lands on top of another.
import { addWidget, applyPlacements, configureWidget, launchpadFromStartDoc, moveWidget, parseLaunchpadDoc, readStartDoc, readingOrder, removeWidget, resizeWidget, serializeLaunchpadDoc, summarizeEdit, EMPTY_LAUNCHPAD_DOC } from "../doc";
import { boxesCollide } from "@ai-matrx/design-system";
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";

const noOverlap = (doc: LaunchpadDoc) => {
  for (const a of doc.widgets) for (const b of doc.widgets) if (a !== b) expect(boxesCollide(a.layout.lg, b.layout.lg)).toBe(false);
};

describe("launchpad doc", () => {
  it("round-trips, keeps unknown types, repairs ids and draws a stored overlap clean", () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      widgets: [
        { id: "a", type: "tasks", config: {}, layout: { lg: { x: 0, y: 0, w: 6, h: 11 } } },
        { type: "from-the-future", config: { deep: { list: [1] } }, layout: { lg: { x: 0, y: 0, w: 6, h: 11 } } },
        { id: "c", type: "agenda", config: {} },
        { id: 7 },
      ],
    });
    const parsed = parseLaunchpadDoc(raw);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.doc.widgets.map((w) => w.type)).toEqual(["tasks", "from-the-future", "agenda"]);
    expect(parsed.doc.widgets[1]!.config).toEqual({ deep: { list: [1] } });
    noOverlap(parsed.doc);
    const again = parseLaunchpadDoc(serializeLaunchpadDoc(parsed.doc));
    expect(again.ok && serializeLaunchpadDoc(again.doc)).toBe(serializeLaunchpadDoc(parsed.doc));
    expect(parseLaunchpadDoc("{").ok).toBe(false);
    expect(parseLaunchpadDoc({ schema: 1, widgets: [] }).ok).toBe(false);
  });

  it("adds at the end below everything, at a reading-order place, and never on top of another", () => {
    let doc = addWidget(EMPTY_LAUNCHPAD_DOC, { type: "kpis", id: "k" });
    doc = addWidget(doc, { type: "tasks", id: "t" });
    doc = addWidget(doc, { type: "agenda", id: "g" });
    expect(doc.widgets.find((w) => w.id === "t")!.layout.lg).toMatchObject({ x: 0, y: 5 });
    expect(doc.widgets.find((w) => w.id === "g")!.layout.lg).toMatchObject({ x: 6, y: 5 }); // beside, not below
    noOverlap(doc);
    const placed = addWidget(doc, { type: "favorites", id: "f" }, 0);
    expect(readingOrder(placed)[0]!.id).toBe("f");
    noOverlap(placed);
  });

  it("a person's add lands in the first free spot from the row they are looking at, never below everything", () => {
    // A small widget in the top-right hole lands there; from a lower row it lands at that row's first hole.
    let doc = addWidget(EMPTY_LAUNCHPAD_DOC, { type: "tasks", id: "a", w: 6 });
    doc = addWidget(doc, { type: "agenda", id: "b", w: 12 });
    doc = addWidget(doc, { type: "recent", id: "c", w: 12 });
    const top = addWidget(doc, { type: "favorites", id: "f", w: 6 }, undefined, 0);
    expect(top.widgets.find((w) => w.id === "f")!.layout.lg).toMatchObject({ x: 6, y: 0 });
    noOverlap(top);
    const lastY = Math.max(...doc.widgets.map((w) => w.layout.lg.y));
    const end = addWidget(doc, { type: "favorites", id: "f", w: 6 });
    expect(end.widgets.find((w) => w.id === "f")!.layout.lg.y).toBeGreaterThan(lastY);
  });

  it("moves in reading order, resizes within limits, configures, removes, applies grid placements", () => {
    let doc = addWidget(addWidget(addWidget(EMPTY_LAUNCHPAD_DOC, { type: "tasks", id: "a", w: 12 }), { type: "agenda", id: "b", w: 12 }), { type: "recent", id: "c", w: 12 });
    doc = moveWidget(doc, "c", 0);
    expect(readingOrder(doc).map((w) => w.id)).toEqual(["c", "a", "b"]);
    doc = resizeWidget(doc, "c", { w: 1 });
    expect(doc.widgets.find((w) => w.id === "c")!.layout.lg.w).toBe(3); // recent: minW 3
    doc = configureWidget(doc, "c", { kind: "note" });
    expect(doc.widgets.find((w) => w.id === "c")!.config).toEqual({ kind: "note" });
    doc = configureWidget(doc, "c", { kind: "" });
    expect(doc.widgets.find((w) => w.id === "c")!.config).toEqual({});
    const placed = applyPlacements(doc, [{ id: "a", lg: { x: 6, y: 0, w: 6, h: 11 }, sm: { x: 0, y: 0, w: 4, h: 11 } }]);
    expect(placed.widgets.find((w) => w.id === "a")!.layout).toEqual({ lg: { x: 6, y: 0, w: 6, h: 11 }, sm: { x: 0, y: 0, w: 4, h: 11 } });
    expect(removeWidget(doc, "zzz")).toBe(doc);
    expect(removeWidget(doc, "a").widgets.map((w) => w.id)).not.toContain("a");
    expect(summarizeEdit(doc, removeWidget(doc, "a"))).toBe("Removed Open and overdue tasks");
  });

  it("moves a Start page in: same widgets, same order, s / m / l as a quarter / half / full width", () => {
    const start = readStartDoc(JSON.stringify({ schema: 1, widgets: [
      { id: "w_kpis", type: "kpis", size: "l", config: { keys: "agents" } },
      { id: "w_tasks", type: "tasks", size: "m", config: {} },
      { id: "w_fav", type: "favorites", size: "s", config: {} },
    ] }));
    expect(start).not.toBeNull();
    const doc = launchpadFromStartDoc(start!);
    expect(readingOrder(doc).map((w) => [w.id, w.layout.lg.x, w.layout.lg.w])).toEqual([["w_kpis", 0, 12], ["w_tasks", 0, 6], ["w_fav", 6, 3]]);
    expect(doc.widgets[0]!.config).toEqual({ keys: "agents" });
    noOverlap(doc);
    expect(readStartDoc("nope")).toBeNull();
  });
});
