"use client";

/**
 * Page layout on a live board (`engine/page-layout.ts` is the math). While a board is in page
 * layout this keeps it arranged as a document — after every change settles (never mid-drag) the
 * chapters are re-stacked and their tiles re-flowed, without an undo step — and locks the camera to
 * the column. Switching layouts keeps the canvas: entering page layout hands the canvas positions to
 * `onKeepCanvas` (saved in the board's settings) before anything moves; leaving it puts them back.
 */

import { useEffect, useRef } from "react";
import type { BoardCameraStore } from "../engine/camera-store";
import { type Rect, screenToWorld } from "../engine/camera";
import { boundsOfPoints, isConnector } from "../engine/shapes";
import type { JsonValue } from "@/types/json";
import { CANVAS_LAYOUT_SETTING, CHAPTER_ORDER_SETTING, LAYOUT_SETTING } from "../persistence/boardsService";
import {
  type BoardLayoutMode,
  interruptedLeave,
  type CanvasSnapshot,
  canvasSnapshot,
  chapterOrder,
  PAGE_COLUMN_W,
  pageLanding,
  planPageLayout,
  restoreCanvas,
} from "../engine/page-layout";
import type { BoardStore } from "../board/useBoard";
import type { BoardTileBase } from "../board/board-store";

/** World px above a chapter kept in view when jumping to it (its title sits there). */
export const PAGE_LABEL_ROOM = 16;

/** Quiet time after a change before the page re-flows. */
const REFLOW_MS = 120;

/** A tile's name when its host keeps one (page layout hides a frame label a tile already shows). */
const tileTitle = (t: BoardTileBase): string | undefined =>
  "title" in t && typeof t.title === "string" ? t.title : undefined;

export function pageScene<T extends BoardTileBase>(board: BoardStore<T>) {
  const now = board.read();
  return {
    tiles: [
      ...now.tiles.map((t) => ({ id: t.id, rect: t.rect, title: tileTitle(t) })),
      ...board
        .getShapes()
        .filter((sh) => !isConnector(sh.kind))
        .map((sh) => ({ id: sh.id, rect: boundsOfPoints(sh.points) })),
    ],
    frames: now.frames.map((f) => ({ id: f.id, rect: f.rect, title: f.title })),
  };
}

/** The page column for this view: the view's own width when it is narrower than the column (a phone), else the default. */
function pageColumnFor(store: BoardCameraStore): number | undefined {
  // A view not measured yet (0 wide: first frame, a hidden pane) keeps the column; it is not a phone.
  if (store.getSize().w <= 0) return undefined;
  const w = Math.floor(store.pageViewWidth());
  return w < PAGE_COLUMN_W ? w : undefined;
}

export function usePageLayout<T extends BoardTileBase>({
  board,
  store,
  layout,
  snapshot,
  chapterOrder: storedOrder,
  saveLayout,
  restoredView,
}: {
  board: BoardStore<T>;
  store: BoardCameraStore | null;
  layout: BoardLayoutMode;
  /** The kept canvas positions (settings), read when leaving page layout. */
  snapshot: CanvasSnapshot | null;
  /** The page's chapter order as it was last left (settings), applied when page layout comes back. */
  chapterOrder: readonly string[] | null;
  /**
   * Write the layout settings in ONE write and resolve only once it landed (not optimistic): the
   * layout prop flips after it, so nothing re-lays before the canvas is safely kept.
   */
  saveLayout?: (patch: Record<string, JsonValue | null>) => Promise<void>;
  /** The board opened at the viewer's own last view (keep it, rather than opening at the top). */
  restoredView: boolean;
}) {
  const snapshotRef = useRef(snapshot);
  const orderRef = useRef(storedOrder);
  useEffect(() => {
    snapshotRef.current = snapshot;
    orderRef.current = storedOrder;
  });
  /** The chapter order the next page arrangement applies (set on the switch into page layout). */
  const entryOrder = useRef<readonly string[] | null>(null);

  /**
   * Switch layouts. Into page layout: the canvas positions and the layout go out in ONE settings
   * write, and the board re-lays only after it landed (a failed write leaves the canvas as it was
   * and rejects). Back to canvas: the layout and the page's chapter order are written, then the
   * kept canvas is put back. The kept canvas is never deleted (the next switch in replaces it).
   */
  const switchLayout = async (next: BoardLayoutMode): Promise<void> => {
    if (next === layout) return;
    if (!saveLayout) throw new Error("This board cannot change its layout.");
    if (next === "page") {
      const kept = canvasSnapshot(pageScene(board));
      await saveLayout({ [LAYOUT_SETTING]: "page", [CANVAS_LAYOUT_SETTING]: kept as unknown as JsonValue });
      return;
    }
    const order = chapterOrder(board.read().frames).map((f) => f.id);
    await saveLayout({ [LAYOUT_SETTING]: null, [CHAPTER_ORDER_SETTING]: order });
  };

  // ── switching landed: re-lay (page) or put the canvas back (canvas) ───────
  const was = useRef(layout);
  useEffect(() => {
    const before = was.current;
    was.current = layout;
    if (before === layout) {
      // Opening on the canvas after a switch back that did not finish saving: finish it.
      if (layout === "canvas" && interruptedLeave(pageScene(board), snapshotRef.current, orderRef.current)) {
        board.reflow(restoreCanvas(pageScene(board), snapshotRef.current!));
        board.clearHistory();
      }
      return;
    }
    // Undo never crosses a layout switch (an older step holds the other layout's positions).
    board.clearHistory();
    if (layout === "page") {
      entryOrder.current = orderRef.current;
      return;
    }
    const kept = snapshotRef.current;
    if (kept) board.reflow(restoreCanvas(pageScene(board), kept));
    board.clearHistory();
    // Fit once the tiles have registered at their restored places.
    if (store) requestAnimationFrame(() => requestAnimationFrame(() => store.fitAll()));
  }, [layout, board, store]);

  // ── page layout: keep the document arranged, camera on the column ─────────
  const opened = useRef(false);
  useEffect(() => {
    if (!store) return;
    if (layout !== "page") {
      store.setPageLock(null);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pressing = false;
    let column = pageColumnFor(store);
    const run = () => {
      timer = null;
      if (pressing) return; // the press's end runs it
      column = pageColumnFor(store);
      const plan = planPageLayout(pageScene(board), entryOrder.current ?? undefined, { columnW: column });
      entryOrder.current = null;
      if (plan.moves.length) board.reflow(plan.moves);
      store.setPageLock({ column: plan.column });
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, REFLOW_MS);
    };
    run();
    // Open at the top of the page (a switch into page layout too), unless this is the board opening
    // at the person's own last view. Again after the tiles have re-registered at their new places.
    let raf = 0;
    if (opened.current || !restoredView) {
      const toTop = () => {
        const sc = pageScene(board);
        const ys = [...sc.frames.map((f) => f.rect.y - PAGE_LABEL_ROOM), ...sc.tiles.map((t) => t.rect.y)];
        store.pageScrollTo(ys.length ? Math.min(...ys) : 0, false);
      };
      toTop();
      raf = requestAnimationFrame(() => (raf = requestAnimationFrame(toTop)));
    }
    opened.current = true;
    const unsubscribe = board.subscribe(schedule);
    // The view crossing the column's width (a phone turned, a window narrowed) re-flows the page to it.
    const unsubscribeSize = store.subscribeFrame(() => {
      if (pageColumnFor(store) !== column) schedule();
    });
    const down = () => {
      pressing = true;
    };
    const up = () => {
      if (!pressing) return;
      pressing = false;
      schedule();
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      unsubscribe();
      unsubscribeSize();
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      store.setPageLock(null);
    };
  }, [layout, store, board, restoredView]);

  /** The outline's move up / down: the chapter swaps places with its neighbour. */
  const moveChapter = (id: string, dir: -1 | 1) => {
    const order = chapterOrder(board.read().frames).map((f) => f.id);
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    const plan = planPageLayout(pageScene(board), order, { columnW: store ? pageColumnFor(store) : undefined });
    if (plan.moves.length) board.reflow(plan.moves);
    const moved = board.read().frames.find((f) => f.id === id);
    if (moved && store) store.pageScrollTo(moved.rect.y - PAGE_LABEL_ROOM);
  };

  /**
   * Page layout: new things land in the chapter being read, or in a new section at the bottom.
   * Returns where the last one will be once the page re-flows (for revealing it), or null.
   */
  const landNew = (ids: readonly string[]): void => {
    if (layout !== "page" || !store) return;
    const scene = pageScene(board);
    const cam = store.getCamera();
    const size = store.getSize();
    const top = store.getInsets().top;
    const line = screenToWorld(cam, size.w / 2, top + (size.h - top) / 3).y;
    const fresh = new Set(ids);
    const others = scene.tiles.filter((t) => !fresh.has(t.id)).map((t) => t.rect);
    const all: Rect[] = [...others, ...scene.frames.map((f) => f.rect)];
    const bottom = all.length ? Math.max(...all.map((r) => r.y + r.h)) : 0;
    const moves: { id: string; x: number; y: number }[] = [];
    for (const t of scene.tiles) {
      if (!fresh.has(t.id)) continue;
      const at = pageLanding(t.rect, scene.frames, line, bottom);
      if (at) moves.push({ id: t.id, ...at });
    }
    board.reflow(moves);
  };

  return { moveChapter, landNew, switchLayout };
}
