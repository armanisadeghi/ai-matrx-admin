// features/launchpad/doc.ts — THE LAUNCHPAD'S VERBS, pure functions over `LaunchpadDoc` (the frozen contract,
// features/shell/shell-layout/contract.ts).
//
// The person's Edit mode and the launchpad agent tools call these same functions; each committed batch is one
// saved version. Every verb returns a NEW doc and never throws: a verb aimed at a widget that is not there
// returns the doc unchanged. Parse keeps widgets of unknown types (a type a later build removed or a newer
// build added) so nothing is ever dropped on a round trip; every placement passes through the GridCanvas
// engine, so a stored overlap draws clean.
import { GRID_CANVAS_COLUMNS, boxesCollide, clampBox, placeBox, placementOf, resolveGrid, type GridBox, type GridPlacement } from "@ai-matrx/design-system";
import {
  LAUNCHPAD_DOC_SCHEMA_VERSION,
  type LaunchpadBinding,
  type LaunchpadBindingEnd,
  type LaunchpadDoc,
  type LaunchpadWidget,
} from "@/features/shell/shell-layout/contract";
import { canFeed, parseBindings } from "./bus/ports";
import { START_SIZE_WIDTH, describeLaunchpadWidget, getLaunchpadWidgetSpec, type StartSize } from "./widgets/catalog";

const COLS = GRID_CANVAS_COLUMNS.lg;

export const EMPTY_LAUNCHPAD_DOC: LaunchpadDoc = { schemaVersion: LAUNCHPAD_DOC_SCHEMA_VERSION, widgets: [] };

/** A short random id, unique within one doc. */
export function newWidgetId(taken: readonly { id: string }[] = []): string {
  for (;;) {
    const id = `w_${Math.random().toString(36).slice(2, 10)}`;
    if (!taken.some((w) => w.id === id)) return id;
  }
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function parsePlacement(v: unknown): GridPlacement | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  const [x, y, w, h] = [num(r.x), num(r.y), num(r.w), num(r.h)];
  return x === null || y === null || w === null || h === null ? null : { x, y, w, h };
}

/** The limits a widget type keeps (unknown types: none beyond the grid). */
function limitsOf(type: string): Pick<GridBox, "minW" | "minH" | "maxW" | "maxH"> {
  const s = getLaunchpadWidgetSpec(type)?.sizes;
  if (!s) return {};
  return { minW: s.minW, minH: s.minH, ...(s.maxW !== undefined ? { maxW: s.maxW } : {}), ...(s.maxH !== undefined ? { maxH: s.maxH } : {}) };
}

const boxOf = (w: LaunchpadWidget): GridBox => ({ id: w.id, ...w.layout.lg, ...limitsOf(w.type) });

/** Every widget's desktop placement made legal and overlap-free (phone placements are resolved at render). */
function settle(widgets: LaunchpadWidget[]): LaunchpadWidget[] {
  const boxes = resolveGrid(widgets.map(boxOf), COLS);
  return widgets.map((w, i) => ({ ...w, layout: { ...w.layout, lg: placementOf(boxes[i]!) } }));
}

export type LaunchpadDocParse = { ok: true; doc: LaunchpadDoc } | { ok: false; error: string };

/**
 * Read a stored doc (string or object). A widget needs a string `type`; everything else is repaired
 * (missing id → one from its place and type, a bad placement → packed below, a bad config → {}).
 */
export function parseLaunchpadDoc(raw: unknown): LaunchpadDocParse {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return { ok: false, error: "The saved launchpad is not readable." };
    }
  }
  if (typeof value !== "object" || value === null) return { ok: false, error: "The saved launchpad is empty." };
  const o = value as { schemaVersion?: unknown; widgets?: unknown; bindings?: unknown };
  if (o.schemaVersion !== LAUNCHPAD_DOC_SCHEMA_VERSION) {
    return { ok: false, error: `The saved launchpad is schema ${String(o.schemaVersion)}, not ${LAUNCHPAD_DOC_SCHEMA_VERSION}.` };
  }
  if (!Array.isArray(o.widgets)) return { ok: false, error: "The saved launchpad has no widget list." };
  const widgets: LaunchpadWidget[] = [];
  const unplaced: { type: string; id: string; config: Record<string, unknown>; sm: GridPlacement | null }[] = [];
  for (const raw of o.widgets) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.type !== "string" || !r.type) continue;
    const base = typeof r.id === "string" && r.id ? r.id : `w_${widgets.length + unplaced.length}_${r.type}`;
    let id = base;
    for (let n = 2; widgets.some((x) => x.id === id) || unplaced.some((x) => x.id === id); n++) id = `${base}_${n}`;
    const config = typeof r.config === "object" && r.config !== null && !Array.isArray(r.config) ? { ...(r.config as Record<string, unknown>) } : {};
    const layout = (typeof r.layout === "object" && r.layout !== null ? r.layout : {}) as Record<string, unknown>;
    const lg = parsePlacement(layout.lg);
    const sm = parsePlacement(layout.sm);
    if (!lg) unplaced.push({ type: r.type, id, config, sm });
    else widgets.push({ id, type: r.type, config, layout: sm ? { lg, sm } : { lg } });
  }
  let doc: LaunchpadDoc = { schemaVersion: LAUNCHPAD_DOC_SCHEMA_VERSION, widgets: settle(widgets) };
  for (const u of unplaced) doc = addWidget(doc, { type: u.type, config: u.config, id: u.id });
  const bindings = parseBindings(o.bindings, new Set(doc.widgets.map((w) => w.id)));
  return { ok: true, doc: bindings.length ? { ...doc, bindings } : doc };
}

/** Bindings are written only when there are some, so a launchpad without connections stores exactly what it did. */
export function serializeLaunchpadDoc(doc: LaunchpadDoc): string {
  const bindings = doc.bindings?.length ? { bindings: doc.bindings } : {};
  return JSON.stringify({ schemaVersion: doc.schemaVersion, widgets: doc.widgets, ...bindings });
}

export function sameLaunchpadDoc(a: LaunchpadDoc, b: LaunchpadDoc): boolean {
  return serializeLaunchpadDoc(a) === serializeLaunchpadDoc(b);
}

/** Widgets in reading order (top to bottom, then left to right) on the desktop grid. */
export function readingOrder(doc: LaunchpadDoc): LaunchpadWidget[] {
  return [...doc.widgets].sort((a, b) => a.layout.lg.y - b.layout.lg.y || a.layout.lg.x - b.layout.lg.x);
}

/** Pack boxes in the GIVEN order, first-fit, never above the previous one (the order is the reading order). */
function packInOrder(boxes: GridBox[]): GridBox[] {
  const placed: GridBox[] = [];
  let cursorY = 0;
  for (const raw of boxes) {
    const b = clampBox(raw, COLS);
    let spot: GridBox | null = null;
    for (let y = cursorY; spot === null; y++) {
      for (let x = 0; x + b.w <= COLS; x++) {
        const c = { ...b, x, y };
        if (!placed.some((p) => boxesCollide(p, c))) {
          spot = c;
          break;
        }
      }
    }
    placed.push(spot);
    cursorY = spot.y;
  }
  return placed;
}

/** The size a new widget of `type` opens at (unknown types: a half-width, ordinary-height box). */
function defaultSize(type: string): { w: number; h: number } {
  const s = getLaunchpadWidgetSpec(type)?.sizes;
  return s ? { w: s.defaultW, h: s.defaultH } : { w: 6, h: 11 };
}

/** Add a widget: at `index` in reading order, else at the end (below everything). */
export function addWidget(
  doc: LaunchpadDoc,
  widget: { type: string; config?: Record<string, unknown>; id?: string; w?: number; h?: number },
  index?: number,
  /** A person adding by hand: search for the first free spot from this row (the top, or the widget they last
   *  touched) instead of after the last widget — so the new widget lands where they are looking. */
  fromRow?: number,
): LaunchpadDoc {
  const id = widget.id && !doc.widgets.some((w) => w.id === widget.id) ? widget.id : newWidgetId(doc.widgets);
  const size = defaultSize(widget.type);
  const next: LaunchpadWidget = {
    id,
    type: widget.type,
    config: { ...(widget.config ?? {}) },
    layout: { lg: { x: 0, y: 0, w: widget.w ?? size.w, h: widget.h ?? size.h } },
  };
  if (index === undefined || index >= doc.widgets.length) {
    // At the end: the first free spot at or after the last widget's row (two halves share a row, the way
    // iOS packs widgets); nothing else moves.
    const order = readingOrder(doc);
    const cursorY = fromRow !== undefined ? Math.max(0, fromRow) : order.length ? order[order.length - 1]!.layout.lg.y : 0;
    const box = clampBox({ ...boxOf(next) }, COLS);
    const taken = doc.widgets.map(boxOf);
    let spot: GridBox | null = null;
    for (let y = cursorY; spot === null; y++) {
      for (let x = 0; x + box.w <= COLS; x++) {
        if (!taken.some((t) => boxesCollide(t, { ...box, x, y }))) {
          spot = { ...box, x, y };
          break;
        }
      }
    }
    next.layout.lg = placementOf(spot);
    return { ...doc, widgets: settle([...doc.widgets, next]) };
  }
  // At a place in reading order (the agent's position): the grid re-packs in the new order.
  const order = readingOrder(doc);
  order.splice(Math.max(0, index), 0, next);
  const packed = packInOrder(order.map(boxOf));
  return { ...doc, widgets: order.map((w, i) => ({ ...w, layout: { lg: placementOf(packed[i]!) } })) };
}

export function removeWidget(doc: LaunchpadDoc, id: string): LaunchpadDoc {
  if (!doc.widgets.some((w) => w.id === id)) return doc;
  const next: LaunchpadDoc = { ...doc, widgets: settle(doc.widgets.filter((w) => w.id !== id)) };
  return withBindings(next, (doc.bindings ?? []).filter((b) => b.from.widgetId !== id && b.to.widgetId !== id));
}

function withBindings(doc: LaunchpadDoc, bindings: LaunchpadBinding[]): LaunchpadDoc {
  const rest: LaunchpadDoc = { ...doc };
  delete rest.bindings;
  return bindings.length ? { ...rest, bindings } : rest;
}

const portOf = (doc: LaunchpadDoc, end: LaunchpadBindingEnd, side: "publishes" | "accepts") => {
  const w = doc.widgets.find((x) => x.id === end.widgetId);
  return w ? getLaunchpadWidgetSpec(w.type)?.[side]?.find((p) => p.key === end.key) : undefined;
};

/** The published values on this page that can feed widget `to`'s input (other widgets only, kind-compatible). */
export function compatibleSources(doc: LaunchpadDoc, to: LaunchpadBindingEnd): { from: LaunchpadBindingEnd; label: string }[] {
  const accept = portOf(doc, to, "accepts");
  if (!accept) return [];
  return readingOrder(doc).flatMap((w) => {
    if (w.id === to.widgetId) return [];
    return (getLaunchpadWidgetSpec(w.type)?.publishes ?? [])
      .filter((p) => canFeed(p.kind, accept.kind))
      .map((p) => ({ from: { widgetId: w.id, key: p.key }, label: `${describeLaunchpadWidget(w)} · ${p.label}` }));
  });
}

/**
 * Connect widget `to`'s input to `from`'s published value (`from: null` disconnects). One connection per
 * input; a connection the two ports cannot make (unknown port, incompatible kinds, a widget to itself)
 * returns the doc unchanged.
 */
export function setBinding(doc: LaunchpadDoc, to: LaunchpadBindingEnd, from: LaunchpadBindingEnd | null): LaunchpadDoc {
  const others = (doc.bindings ?? []).filter((b) => !(b.to.widgetId === to.widgetId && b.to.key === to.key));
  if (!from) return others.length === (doc.bindings ?? []).length ? doc : withBindings(doc, others);
  const accept = portOf(doc, to, "accepts");
  const publish = portOf(doc, from, "publishes");
  if (!accept || !publish || from.widgetId === to.widgetId || !canFeed(publish.kind, accept.kind)) return doc;
  return withBindings(doc, [...others, { from: { ...from }, to: { ...to } }]);
}

/** Move a widget to `toIndex` in reading order (clamped); the grid re-packs in the new order. */
export function moveWidget(doc: LaunchpadDoc, id: string, toIndex: number): LaunchpadDoc {
  const order = readingOrder(doc);
  const from = order.findIndex((w) => w.id === id);
  if (from < 0) return doc;
  const to = Math.max(0, Math.min(toIndex, order.length - 1));
  if (to === from) return doc;
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved!);
  const packed = packInOrder(order.map(boxOf));
  // A reorder rewrites the phone grid too: drop phone placements so the phone reflows in the new order.
  return { ...doc, widgets: order.map((w, i) => ({ ...w, layout: { lg: placementOf(packed[i]!) } })) };
}

/** Resize one widget on the desktop grid (within its limits); neighbors are pushed down. */
export function resizeWidget(doc: LaunchpadDoc, id: string, size: { w?: number; h?: number }): LaunchpadDoc {
  if (!doc.widgets.some((w) => w.id === id)) return doc;
  const boxes = placeBox(doc.widgets.map(boxOf), id, size, COLS);
  return { ...doc, widgets: doc.widgets.map((w, i) => ({ ...w, layout: { ...w.layout, lg: placementOf(boxes[i]!) } })) };
}

/** Merge config keys into a widget's config (a value of "" clears that key). */
export function configureWidget(doc: LaunchpadDoc, id: string, patch: Record<string, unknown>): LaunchpadDoc {
  if (!doc.widgets.some((w) => w.id === id)) return doc;
  return {
    ...doc,
    widgets: doc.widgets.map((w) => {
      if (w.id !== id) return w;
      const config = { ...w.config };
      for (const [k, v] of Object.entries(patch)) {
        if (v === "" || v === undefined || v === null) delete config[k];
        else config[k] = v;
      }
      return { ...w, config };
    }),
  };
}

/** Apply the grid's committed placements (GridCanvas `onChange`). Unknown ids are ignored. */
export function applyPlacements(doc: LaunchpadDoc, placements: readonly { id: string; lg: GridPlacement; sm?: GridPlacement | undefined }[]): LaunchpadDoc {
  const byId = new Map(placements.map((p) => [p.id, p]));
  return {
    ...doc,
    widgets: doc.widgets.map((w) => {
      const p = byId.get(w.id);
      if (!p) return w;
      return { ...w, layout: p.sm ? { lg: placementOf(p.lg), sm: placementOf(p.sm) } : { lg: placementOf(p.lg) } };
    }),
  };
}

/** The one-line note a saved version carries ("Added Tasks · Moved or resized"), from the widgets' own lines. */
export function summarizeEdit(before: LaunchpadDoc, after: LaunchpadDoc): string {
  const beforeIds = new Set(before.widgets.map((w) => w.id));
  const afterIds = new Set(after.widgets.map((w) => w.id));
  const added = after.widgets.filter((w) => !beforeIds.has(w.id)).map(describeLaunchpadWidget);
  const removed = before.widgets.filter((w) => !afterIds.has(w.id)).map(describeLaunchpadWidget);
  const parts: string[] = [];
  if (added.length) parts.push(`Added ${added.join(", ")}`);
  if (removed.length) parts.push(`Removed ${removed.join(", ")}`);
  let placed = false;
  let configured = false;
  for (const w of after.widgets) {
    const old = before.widgets.find((b) => b.id === w.id);
    if (!old) continue;
    if (JSON.stringify(old.layout) !== JSON.stringify(w.layout)) placed = true;
    if (JSON.stringify(old.config) !== JSON.stringify(w.config)) configured = true;
  }
  if (placed && !added.length && !removed.length) parts.push("Moved or resized");
  if (configured) parts.push("Set up widgets");
  if (JSON.stringify(before.bindings ?? []) !== JSON.stringify(after.bindings ?? [])) parts.push("Connected widgets");
  const note = parts.join(" · ") || "Saved launchpad";
  return note.length > 120 ? `${note.slice(0, 117)}…` : note;
}

// ── Start → launchpad (the one-time move of a person's Start page) ─────────────────────────────────

/** A Start page doc as `start_layout` stored it (schema 1: widgets in reading order, sizes s / m / l). */
export interface StoredStartDoc {
  schema: 1;
  widgets: { id?: string; type: string; size?: string; config?: Record<string, unknown> }[];
}

/** Read a stored Start doc; null when it is not one. */
export function readStartDoc(raw: unknown): StoredStartDoc | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof value !== "object" || value === null) return null;
  const o = value as { schema?: unknown; widgets?: unknown };
  if (o.schema !== 1 || !Array.isArray(o.widgets)) return null;
  const widgets = o.widgets.filter(
    (w): w is StoredStartDoc["widgets"][number] => typeof w === "object" && w !== null && typeof (w as { type?: unknown }).type === "string",
  );
  return { schema: 1, widgets };
}

/** The Start page as a launchpad: same widgets, same order, s / m / l as quarter / half / full width. */
export function launchpadFromStartDoc(start: StoredStartDoc): LaunchpadDoc {
  let doc = EMPTY_LAUNCHPAD_DOC;
  for (const w of start.widgets) {
    const size = (w.size === "s" || w.size === "m" || w.size === "l" ? w.size : "m") as StartSize;
    doc = addWidget(doc, { type: w.type, config: { ...(w.config ?? {}) }, ...(w.id ? { id: w.id } : {}), w: START_SIZE_WIDTH[size] });
  }
  return doc;
}
