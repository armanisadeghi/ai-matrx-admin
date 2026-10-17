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
import {
  type BoardLayoutMode,
  type CanvasSnapshot,
  canvasSnapshot,
  chapterOrder,
  pageLanding,
  planPageLayout,
  restoreCanvas,
} from "../engine/page-layout";
import type { BoardStore } from "../board/useBoard";
import type { BoardTileBase } from "../board/board-store";

/** World px above a chapter kept in view when jumping to it (its title sits there). */
export const PAGE_LABEL_ROOM = 56;

/** Quiet time after a change before the page re-flows. */
const REFLOW_MS = 120;

export function pageScene<T extends BoardTileBase>(board: BoardStore<T>) {
  const now = board.read();
  return {
    tiles: [
      ...now.tiles.map((t) => ({ id: t.id, rect: t.rect })),
      ...board
        .getShapes()
        .filter((sh) => !isConnector(sh.kind))
        .map((sh) => ({ id: sh.id, rect: boundsOfPoints(sh.points) })),
    ],
    frames: now.frames.map((f) => ({ id: f.id, rect: f.rect })),
  };
}

export function usePageLayout<T extends BoardTileBase>({
  board,
  store,
  layout,
  snapshot,
  onKeepCanvas,
  restoredView,
}: {
  board: BoardStore<T>;
  store: BoardCameraStore | null;
  layout: BoardLayoutMode;
  /** The kept canvas positions (settings), read when leaving page layout. */
  snapshot: CanvasSnapshot | null;
  onKeepCanvas?: (snapshot: CanvasSnapshot | null) => void;
  /** The board opened at the viewer's own last view (keep it, rather than opening at the top). */
  restoredView: boolean;
}) {
  const snapshotRef = useRef(snapshot);
  const keepRef = useRef(onKeepCanvas);
  useEffect(() => {
    snapshotRef.current = snapshot;
    keepRef.current = onKeepCanvas;
  });

  // ── switching: keep the canvas on the way in, put it back on the way out ──
  const was = useRef(layout);
  useEffect(() => {
    const before = was.current;
    was.current = layout;
    if (before === layout) return;
    if (layout === "page") {
      keepRef.current?.(canvasSnapshot(pageScene(board)));
      return;
    }
    const kept = snapshotRef.current;
    if (kept) board.reflow(restoreCanvas(pageScene(board), kept));
    keepRef.current?.(null);
    if (store) requestAnimationFrame(() => store.fitAll());
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
    const run = () => {
      timer = null;
      if (pressing) return; // the press's end runs it
      const plan = planPageLayout(pageScene(board));
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
    const plan = planPageLayout(pageScene(board), order);
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

  return { moveChapter, landNew };
}
