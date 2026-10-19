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
import { frameAtTop } from "../engine/arrange";
import type { JsonValue } from "@/types/json";
import { CANVAS_LAYOUT_SETTING, CHAPTER_ORDER_SETTING, LAYOUT_SETTING } from "../persistence/boardsService";
import {
  type BoardLayoutMode,
  interruptedLeave,
  type CanvasSnapshot,
  canvasSnapshot,
  chapterOrder,
  pageColumnWidth,
  PAGE_COLUMN_W,
  pageLanding,
  type PagePlan,
  planPageLayout,
  planPageProjection,
  restoreCanvas,
} from "../engine/page-layout";
import type { BoardStore } from "../board/useBoard";
import type { BoardTileBase } from "../board/board-store";

/** World px above a chapter kept in view when jumping to it (its title sits there). */
export const PAGE_LABEL_ROOM = 16;

/** A press with no release seen this long is treated as released (its pointerup went elsewhere). */
const PRESS_RELEASE_MS = 3000;

/** Quiet time after a change before the page re-flows. */
const REFLOW_MS = 120;

/** A tile's name when its host keeps one (page layout hides a frame label a tile already shows). */
const tileTitle = (t: BoardTileBase): string | undefined =>
  "title" in t && typeof t.title === "string" ? t.title : undefined;

/** The chapter (frame id) a tile is filed in, when its host keeps one (`BoardNode.chapter`). */
const tileChapter = (t: BoardTileBase): string | undefined =>
  "chapter" in t && typeof t.chapter === "string" ? t.chapter : undefined;

/**
 * Keep each tile's filing (`chapter`) as the plan filed it, without an undo step: a reload (or another
 * device) then opens every tile in its own chapter, never re-reading it from geometry.
 */
function keepFiling<T extends BoardTileBase>(board: BoardStore<T>, members: ReadonlyMap<string, string>): void {
  for (const t of board.read().tiles) {
    const next = members.get(t.id);
    if (tileChapter(t) === next) continue;
    board.updateTile(t.id, { chapter: next } as unknown as Partial<T>, { history: false });
  }
}

export function pageScene<T extends BoardTileBase>(board: BoardStore<T>) {
  const now = board.read();
  return {
    tiles: [
      ...now.tiles.map((t) => ({ id: t.id, rect: t.rect, title: tileTitle(t), chapter: tileChapter(t) })),
      // A drawn mark or canvas text stacks with the rest but keeps its own size (never stretched).
      ...board
        .getShapes()
        .filter((sh) => !isConnector(sh.kind))
        .map((sh) => ({ id: sh.id, rect: boundsOfPoints(sh.points), fixedSize: true })),
    ],
    frames: now.frames.map((f) => ({ id: f.id, rect: f.rect, title: f.title })),
  };
}

/**
 * Lay the page out for this view, and keep the board's SAVED page canonical (the full column).
 *  - A wide view (`columnW` undefined): the page is planned at the column and that is saved.
 *  - A narrow view (a phone): the narrowed page is a view-local projection (`BoardStore.project`), never
 *    saved; the saved page is re-planned at the full column from this view's filing and order, so only a
 *    real change (a tile moved, added or refiled, a chapter reordered) changes what is saved, and a
 *    height measured at the narrow width never does.
 * Returns the plan this view shows (its `members` / `placed` are what the next plan is handed).
 */
export function relayPage<T extends BoardTileBase>(
  board: BoardStore<T>,
  frameOrder: readonly string[] | undefined,
  opts: {
    columnW?: number;
    members?: ReadonlyMap<string, string>;
    placed?: ReadonlyMap<string, { x: number; y: number }>;
    byPlace?: boolean;
  },
): PagePlan {
  const { columnW } = opts;
  if (columnW !== undefined && columnW < PAGE_COLUMN_W) {
    const { view, saved } = planPageProjection(pageScene(board), board.getSavedLayout(), frameOrder, { ...opts, columnW });
    board.project(view.moves, saved);
    keepFiling(board, view.members);
    return view;
  }
  board.endProjection();
  const plan = planPageLayout(pageScene(board), frameOrder, opts);
  if (plan.moves.length) board.reflow(plan.moves);
  keepFiling(board, plan.members);
  return plan;
}

/** The page column for this view: the view's own width when it is narrower than the column (a phone), else the default. */
function pageColumnFor(store: BoardCameraStore): number | undefined {
  // An unmeasured (0), hidden or squeezed view keeps the column: it is not a phone (`PAGE_MIN_VIEW_W`).
  return pageColumnWidth(store.getSize().w, store.pageViewWidth());
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
  /** The chapter each tile was placed in: kept between re-flows so a growing tile stays in its chapter. */
  const membersRef = useRef<ReadonlyMap<string, string> | undefined>(undefined);
  /** Where the last plan put each tile: a tile no longer there was moved by the person (refiled by place). */
  const placedRef = useRef<ReadonlyMap<string, { x: number; y: number }> | undefined>(undefined);
  /** The next plan files every tile by where it sits (the switch in from the canvas the person arranged). */
  const byPlaceRef = useRef(false);
  /** Lay the page out (`relayPage`) and remember the plan's filing and placement for the next one. */
  const relay = (order: readonly string[] | undefined, opts: { columnW?: number; byPlace?: boolean }): PagePlan => {
    const plan = relayPage(board, order, {
      ...opts,
      members: opts.byPlace ? undefined : membersRef.current,
      placed: opts.byPlace ? undefined : placedRef.current,
    });
    membersRef.current = plan.members;
    placedRef.current = plan.placed;
    return plan;
  };
  /** Run a re-flow that is waiting now (set while page layout is on): a jump then reads settled places. */
  const flushRef = useRef<(() => void) | null>(null);
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
      // The person switched from the canvas they arranged: the first page plan files tiles by place. Set
      // here, never on a layout prop change alone (a board whose settings load after its tiles would
      // otherwise refile every tile by geometry on open).
      byPlaceRef.current = true;
      const kept = canvasSnapshot(pageScene(board));
      try {
        await saveLayout({ [LAYOUT_SETTING]: "page", [CANVAS_LAYOUT_SETTING]: kept as unknown as JsonValue });
      } catch (e) {
        byPlaceRef.current = false;
        throw e;
      }
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
      // On the canvas the person files a tile by where they put it: a filed tile dragged into another
      // frame (or out of every frame) takes that filing, so page layout never pulls it back.
      let canvasTimer: ReturnType<typeof setTimeout> | null = null;
      const refile = () => {
        canvasTimer = null;
        const now = board.read();
        for (const t of now.tiles) {
          const filed = tileChapter(t);
          if (!filed) continue;
          const here = frameAtTop(t.rect, now.frames) ?? undefined;
          if (here !== filed) board.updateTile(t.id, { chapter: here } as unknown as Partial<T>, { history: false });
        }
      };
      const unsubscribeCanvas = board.subscribe(() => {
        if (canvasTimer) clearTimeout(canvasTimer);
        canvasTimer = setTimeout(refile, REFLOW_MS);
      });
      return () => {
        if (canvasTimer) clearTimeout(canvasTimer);
        unsubscribeCanvas();
      };
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pressing = false;
    let column = pageColumnFor(store);
    const run = () => {
      timer = null;
      if (pressing) return; // the press's end runs it
      column = pageColumnFor(store);
      const byPlace = byPlaceRef.current;
      byPlaceRef.current = false;
      const plan = relay(entryOrder.current ?? undefined, { columnW: column, byPlace });
      entryOrder.current = null;
      store.setPageLock({ column: plan.column });
    };
    flushRef.current = () => {
      if (pressing) return;
      // A re-flow is waiting (a change, or the view crossed the column's width): run it now.
      if (timer || pageColumnFor(store) !== column) {
        if (timer) clearTimeout(timer);
        run();
      }
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
    // A press whose release never reaches the window (a drawer or menu that captured it) must not
    // stop the page from re-flowing for good: it counts as released after a few seconds.
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    const down = () => {
      pressing = true;
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        pressTimer = null;
        if (!pressing) return;
        pressing = false;
        schedule();
      }, PRESS_RELEASE_MS);
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
      if (pressTimer) clearTimeout(pressTimer);
      cancelAnimationFrame(raf);
      unsubscribe();
      unsubscribeSize();
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      flushRef.current = null;
      store.setPageLock(null);
      // Leaving page layout (or the board): the board shows what it saves again.
      board.endProjection();
    };
  }, [layout, store, board, restoredView]);

  /** The outline's move up / down: the chapter swaps places with its neighbour. */
  const moveChapter = (id: string, dir: -1 | 1) => {
    const order = chapterOrder(board.read().frames).map((f) => f.id);
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    relay(order, { columnW: store ? pageColumnFor(store) : undefined });
    const moved = board.read().frames.find((f) => f.id === id);
    if (moved && store) store.pageScrollTo(moved.rect.y - PAGE_LABEL_ROOM);
  };

  /**
   * Where a chapter's top is on this view's page, once any waiting re-flow has run (the outline's jump:
   * after a width change the page is still re-flowing, and the old place would land the jump wrong).
   */
  const chapterTop = (id: string): number | null => {
    flushRef.current?.();
    return board.read().frames.find((f) => f.id === id)?.rect.y ?? null;
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

  return { moveChapter, landNew, switchLayout, chapterTop };
}
