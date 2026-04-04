"use client";

/**
 * useWindowPanel
 *
 * Connects a single WindowPanel instance to the Redux window-manager slice.
 * Handles:
 *  - Registration / cleanup on mount/unmount
 *  - Drag-to-move (header mousedown → document mousemove/mouseup)
 *  - Resize (edge/corner handles → document mousemove/mouseup)
 *  - Window state transitions (windowed / maximized / minimized)
 *  - Focus-on-click (brings panel to top of z stack)
 *
 * Pure CSS resize via inline styles; no Tailwind width classes after mount.
 */

import { useEffect, useRef, useCallback, useId } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  registerWindow,
  unregisterWindow,
  focusWindow,
  restoreWindow,
  maximizeWindow,
  minimizeWindow,
  updateWindowRect,
  updateWindowTitle,
  selectWindow,
  type WindowRect,
} from "@/lib/redux/slices/windowManagerSlice";

// ─── Config ────────────────────────────────────────────────────────────────────

const MIN_WIDTH = 180;
const MIN_HEIGHT = 80;
const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 400;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ResizeEdge =
  | "e" // right
  | "s" // bottom
  | "se" // bottom-right corner
  | "w" // left
  | "sw" // bottom-left
  | "n" // top
  | "ne" // top-right
  | "nw"; // top-left

export interface UseWindowPanelOptions {
  /** Stable, unique id. If omitted a React useId-based id is used. */
  id?: string;
  /** Title shown in the header and tray chip. */
  title?: string;
  /** Initial position and size. Defaults to centred with 320×400. */
  initialRect?: Partial<WindowRect>;
  /** Maximum width the user can resize to. */
  maxWidth?: number;
  /** Maximum height the user can resize to. */
  maxHeight?: number;
}

export interface UseWindowPanelReturn {
  /** The stable window id. */
  id: string;
  /** Current window state from Redux. */
  windowState: "windowed" | "maximized" | "minimized";
  /** Current windowed rect from Redux. */
  rect: WindowRect;
  /** z-index from Redux. */
  zIndex: number;
  /** Mousedown handler for the drag handle (header). */
  onDragStart: (e: React.MouseEvent) => void;
  /** Mousedown handler factory for resize handles. */
  onResizeStart: (edge: ResizeEdge) => (e: React.MouseEvent) => void;
  /** Bring this window to the top. */
  onFocus: () => void;
  /** Transition to windowed state. */
  onRestore: () => void;
  /** Transition to maximized state. */
  onMaximize: () => void;
  /** Transition to minimized (tray) state. */
  onMinimize: () => void;
  /** Toggle maximized ↔ windowed. */
  onToggleMaximize: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useWindowPanel(
  opts: UseWindowPanelOptions = {},
): UseWindowPanelReturn {
  const reactId = useId();
  const id = opts.id ?? reactId;

  const dispatch = useAppDispatch();
  const entry = useAppSelector(selectWindow(id));

  const maxWidth = opts.maxWidth ?? Infinity;
  const maxHeight = opts.maxHeight ?? Infinity;

  // ── Registration ────────────────────────────────────────────────────────────
  useEffect(() => {
    const initial: WindowRect = {
      x:
        opts.initialRect?.x ??
        Math.max(0, (window.innerWidth - DEFAULT_WIDTH) / 2),
      y:
        opts.initialRect?.y ??
        Math.max(0, (window.innerHeight - DEFAULT_HEIGHT) / 4),
      width: opts.initialRect?.width ?? DEFAULT_WIDTH,
      height: opts.initialRect?.height ?? DEFAULT_HEIGHT,
    };
    dispatch(registerWindow({ id, title: opts.title, initial }));
    return () => {
      dispatch(unregisterWindow(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Keep title in sync if it changes after mount ─────────────────────────
  useEffect(() => {
    if (opts.title !== undefined) {
      dispatch(updateWindowTitle({ id, title: opts.title }));
    }
  }, [id, opts.title, dispatch]);

  // ── Drag-to-move ─────────────────────────────────────────────────────────────
  const dragStart = useRef<{
    mx: number;
    my: number;
    wx: number;
    wy: number;
  } | null>(null);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(focusWindow(id));
      if (!entry || entry.state !== "windowed") return;
      dragStart.current = {
        mx: e.clientX,
        my: e.clientY,
        wx: entry.windowed.x,
        wy: entry.windowed.y,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        const nx = dragStart.current.wx + (ev.clientX - dragStart.current.mx);
        const ny = dragStart.current.wy + (ev.clientY - dragStart.current.my);
        dispatch(updateWindowRect({ id, rect: { x: nx, y: ny } }));
      };
      const onUp = () => {
        dragStart.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [dispatch, id, entry],
  );

  // ── Resize ────────────────────────────────────────────────────────────────────
  const onResizeStart = useCallback(
    (edge: ResizeEdge) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch(focusWindow(id));
      if (!entry || entry.state !== "windowed") return;

      const startMx = e.clientX;
      const startMy = e.clientY;
      const { x, y, width, height } = entry.windowed;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startMx;
        const dy = ev.clientY - startMy;
        let nx = x,
          ny = y,
          nw = width,
          nh = height;

        if (edge.includes("e"))
          nw = Math.min(maxWidth, Math.max(MIN_WIDTH, width + dx));
        if (edge.includes("s"))
          nh = Math.min(maxHeight, Math.max(MIN_HEIGHT, height + dy));
        if (edge.includes("w")) {
          nw = Math.min(maxWidth, Math.max(MIN_WIDTH, width - dx));
          nx = x + (width - nw);
        }
        if (edge.includes("n")) {
          nh = Math.min(maxHeight, Math.max(MIN_HEIGHT, height - dy));
          ny = y + (height - nh);
        }

        dispatch(
          updateWindowRect({
            id,
            rect: { x: nx, y: ny, width: nw, height: nh },
          }),
        );
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [dispatch, id, entry, maxWidth, maxHeight],
  );

  // ── Window state transitions ───────────────────────────────────────────────
  const onFocus = useCallback(() => dispatch(focusWindow(id)), [dispatch, id]);
  const onRestore = useCallback(
    () => dispatch(restoreWindow(id)),
    [dispatch, id],
  );
  const onMaximize = useCallback(
    () => dispatch(maximizeWindow(id)),
    [dispatch, id],
  );
  const onMinimize = useCallback(
    () => dispatch(minimizeWindow(id)),
    [dispatch, id],
  );
  const onToggleMaximize = useCallback(() => {
    if (entry?.state === "maximized") dispatch(restoreWindow(id));
    else dispatch(maximizeWindow(id));
  }, [dispatch, id, entry]);

  // ── Stable fallback rect before first render ───────────────────────────────
  const rect: WindowRect = entry?.windowed ?? {
    x: 0,
    y: 0,
    width: opts.initialRect?.width ?? DEFAULT_WIDTH,
    height: opts.initialRect?.height ?? DEFAULT_HEIGHT,
  };

  return {
    id,
    windowState: entry?.state ?? "windowed",
    rect,
    zIndex: entry?.zIndex ?? 1000,
    onDragStart,
    onResizeStart,
    onFocus,
    onRestore,
    onMaximize,
    onMinimize,
    onToggleMaximize,
  };
}
