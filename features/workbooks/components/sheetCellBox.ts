/**
 * Where a cell is on screen. `FRange.getCellRect()` returns SHEET coordinates (no scroll, no zoom, no canvas offset), so
 * nothing that draws over the canvas may use it as screen pixels. This is the transform Univer's own cell popups use:
 * (cell - the main viewport's scroll) x zoom, plus the canvas's place on the page.
 */
import { IRenderManagerService } from "@univerjs/engine-render";
import { SheetSkeletonManagerService } from "@univerjs/preset-sheets-core";

export type CellBox = { left: number; right: number; top: number; bottom: number };
type Injector = { get<T>(token: unknown): T };

let warnedPlacement = false;
/** Say once, with the reason, when cell marks cannot be placed (never silently empty). */
export function warnPlacement(why: string, extra?: unknown) {
  if (warnedPlacement) return;
  warnedPlacement = true;
  console.warn(`[workbook] cells cannot be placed over the canvas: ${why}`, extra ?? "");
}

/** The injector of a Univer instance, or of its FUniver facade (which keeps it as `_injector`). */
export function injectorOfUniver(univer: unknown): Injector | null {
  const u = univer as { __getInjector?: () => Injector; _injector?: Injector } | null;
  return u?.__getInjector?.() ?? u?._injector ?? null;
}

/** A cell's box on screen (client coordinates), the way Univer's own cell popups place themselves. */
export function cellBox(injector: Injector, unitId: string, row: number, col: number): CellBox | null {
  const manager = injector.get<{ getRenderUnitById?: (id: string) => unknown; getRenderById?: (id: string) => unknown }>(IRenderManagerService);
  const render = (manager.getRenderUnitById?.(unitId) ?? manager.getRenderById?.(unitId)) as
    | { scene: { getAncestorScale(): { scaleX: number; scaleY: number }; getViewport(key: string): { viewportScrollX: number; viewportScrollY: number } | null }; engine: { getCanvasElement(): HTMLCanvasElement | null }; with<T>(t: unknown): T }
    | undefined;
  if (!render) {
    warnPlacement("no render for the workbook");
    return null;
  }
  const skeleton = render.with<{ getCurrentParam(): { skeleton?: { getCellWithCoordByIndex(r: number, c: number): { startX: number; startY: number; endX: number; endY: number; isMergedMainCell?: boolean; mergeInfo?: { startX: number; startY: number; endX: number; endY: number } } } } | null }>(SheetSkeletonManagerService).getCurrentParam()?.skeleton;
  const viewport = render.scene.getViewport("viewMain");
  const canvas = render.engine.getCanvasElement();
  if (!skeleton || !viewport || !canvas) {
    warnPlacement("render pieces missing", { skeleton: !!skeleton, viewport: !!viewport, canvas: !!canvas });
    return null;
  }
  const p = skeleton.getCellWithCoordByIndex(row, col);
  const cell = p.isMergedMainCell && p.mergeInfo ? p.mergeInfo : p;
  const { scaleX, scaleY } = render.scene.getAncestorScale();
  const rect = canvas.getBoundingClientRect();
  const styleWidth = parseFloat(canvas.style.width) || rect.width;
  const k = rect.width / styleWidth;
  return {
    left: (cell.startX - viewport.viewportScrollX) * k * scaleX + rect.left,
    right: (cell.endX - viewport.viewportScrollX) * k * scaleX + rect.left,
    top: (cell.startY - viewport.viewportScrollY) * k * scaleY + rect.top,
    bottom: (cell.endY - viewport.viewportScrollY) * k * scaleY + rect.top,
  };
}

