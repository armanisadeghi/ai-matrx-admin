"use client";

/**
 * BoardOutline — the board's left rail: its CHAPTERS (the frames, in reading order; click flies to
 * one, the one being read is highlighted as the view moves) and its PAGES (the board's sub-boards:
 * the top board and every page under it; "Add page" makes one and opens it). Shown by default in
 * page layout, a toggle on the canvas; on a phone it is a bottom drawer.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FileText, Frame, LoaderCircle, PanelLeftClose, Plus } from "lucide-react";
import { ErrorNotice, PANEL_MOTION_CLASS } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import type { BoardCameraStore } from "../engine/camera-store";
import { screenToWorld } from "../engine/camera";
import { frameKey } from "../engine/selection";
import { activeChapter, chapterOrder, type BoardLayoutMode } from "../engine/page-layout";
import type { BoardFrame } from "../board/board-store";

/** Rail width, px. */
export const OUTLINE_WIDTH = 240;

export interface OutlinePages {
  /** null while the first read is out. */
  list: readonly { id: string; title: string; parentId: string | null }[] | null;
  currentId: string;
  error: string | null;
  adding: boolean;
  onAdd: () => void;
  onRetry: () => void;
}

interface OutlineProps {
  frames: readonly BoardFrame[];
  store: BoardCameraStore | null;
  layout: BoardLayoutMode;
  pages: OutlinePages | null;
  /** Page layout only: move a chapter up or down. */
  onMoveChapter?: (id: string, dir: -1 | 1) => void;
  onClose: () => void;
}

/** The chapter being read: in page layout the last one whose top passed the upper third; on the canvas the one under the view's centre. */
function useActiveChapter(
  store: BoardCameraStore | null,
  chapters: readonly BoardFrame[],
  layout: BoardLayoutMode,
): { active: string | null; pin: (id: string) => void } {
  const [active, setActive] = useState<string | null>(null);
  // A chapter picked in the outline stays highlighted until the person moves the view themselves
  // (the last chapters of a page cannot scroll to the reading line).
  const [pin, setPin] = useState<{ id: string; layout: BoardLayoutMode } | null>(null);
  const pinned = pin && pin.layout === layout ? pin.id : null; // a layout switch drops it
  useEffect(() => {
    if (!pinned) return;
    const unpin = () => setPin(null);
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("wheel", unpin, opts);
    window.addEventListener("keydown", unpin, opts);
    window.addEventListener("touchmove", unpin, opts);
    return () => {
      window.removeEventListener("wheel", unpin, opts);
      window.removeEventListener("keydown", unpin, opts);
      window.removeEventListener("touchmove", unpin, opts);
    };
  }, [pinned]);
  useEffect(() => {
    if (!store) return;
    const compute = () => {
      const cam = store.getCamera();
      const size = store.getSize();
      const top = store.getInsets().top;
      let next: string | null;
      if (layout === "page") {
        const line = screenToWorld(cam, size.w / 2, top + (size.h - top) / 3).y;
        // At the top of the page the first chapter is the one being read, however short it is.
        const first = chapters[0];
        const atTop = first ? first.rect.y * cam.z + cam.y >= top : false;
        next = atTop ? first.id : activeChapter(chapters, line);
      } else {
        const c = screenToWorld(cam, size.w / 2, size.h / 2);
        next =
          chapters.find((f) => c.x >= f.rect.x && c.x <= f.rect.x + f.rect.w && c.y >= f.rect.y && c.y <= f.rect.y + f.rect.h)?.id ??
          null;
      }
      setActive((cur) => (cur === next ? cur : next));
    };
    compute();
    return store.subscribeFrame(compute);
  }, [store, chapters, layout]);
  return { active: pinned ?? active, pin: (id: string) => setPin({ id, layout }) };
}

function OutlineBody({ frames, store, layout, pages, onMoveChapter, onClose, fill = false }: OutlineProps & { fill?: boolean }) {
  const chapters = chapterOrder(frames);
  const { active, pin } = useActiveChapter(store, chapters, layout);
  const go = (f: BoardFrame) => {
    if (!store) return;
    pin(f.id);
    if (layout === "page") store.pageScrollTo(f.rect.y - 56);
    else store.fitItem(frameKey(f.id), 48);
    store.select(f.id);
    if (fill) onClose(); // the phone's drawer steps aside to show the chapter
  };
  return (
    <div className="flex h-full min-h-0 flex-col" style={fill ? undefined : { width: OUTLINE_WIDTH }}>
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <span className="text-sm font-medium text-foreground">Outline</span>
        <button
          type="button"
          onClick={onClose}
          title="Hide outline"
          aria-label="Hide outline"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2" data-board-outline>
        <div className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">Chapters</div>
        {chapters.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Add a frame to start a chapter</div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {chapters.map((f, i) => (
              <li key={f.id} className="group relative">
                <button
                  type="button"
                  onClick={() => go(f)}
                  aria-current={active === f.id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    active === f.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Frame className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{f.title || "Untitled frame"}</span>
                </button>
                {onMoveChapter && chapters.length > 1 && (
                  <span className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center group-hover:flex group-focus-within:flex">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => onMoveChapter(f.id, -1)}
                      title="Move up"
                      aria-label={`Move ${f.title || "frame"} up`}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground disabled:text-disabled-foreground"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === chapters.length - 1}
                      onClick={() => onMoveChapter(f.id, 1)}
                      title="Move down"
                      aria-label={`Move ${f.title || "frame"} down`}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground disabled:text-disabled-foreground"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {pages && (
          <>
            <div className="mt-3 flex items-center justify-between px-2 pb-1 pt-1">
              <span className="text-xs font-medium text-muted-foreground">Pages</span>
              <button
                type="button"
                onClick={pages.onAdd}
                disabled={pages.adding}
                title="Add page"
                aria-label="Add page"
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:text-disabled-foreground"
              >
                {pages.adding ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>
            {pages.error ? (
              <ErrorNotice
                size="compact"
                className="mx-1"
                title="Pages could not load"
                message={pages.error}
                operation="Read pages"
                calls={["boards"]}
                actions={<Button variant="quiet" onClick={pages.onRetry}>Retry</Button>}
              />
            ) : pages.list === null ? (
              <div className="flex flex-col gap-1 px-2 py-1" aria-label="Loading pages">
                <div className="h-6 rounded-md bg-muted" />
                <div className="ml-4 h-6 rounded-md bg-muted" />
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {pages.list.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/board/${p.id}`}
                      aria-current={p.id === pages.currentId ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-sm",
                        p.parentId ? "pl-6" : "pl-2",
                        p.id === pages.currentId ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={pages.onAdd}
                    disabled={pages.adding}
                    className="flex w-full items-center gap-2 rounded-md py-1.5 pl-6 pr-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:text-disabled-foreground"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Add page
                  </button>
                </li>
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Desktop: a rail that slides open beside the board (stays mounted, inert when closed). Phone: a bottom drawer. */
export function BoardOutline(props: OutlineProps & { open: boolean; mobile: boolean }) {
  const { open, mobile, ...rest } = props;
  if (mobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && rest.onClose()}>
        <DrawerContent className="h-[70dvh] bg-background">
          <DrawerTitle className="sr-only">Outline</DrawerTitle>
          <OutlineBody {...rest} fill />
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <aside
      aria-label="Board outline"
      inert={!open}
      className={cn("h-full min-h-0 shrink-0 overflow-hidden border-border bg-card transition-[width]", open && "border-r", PANEL_MOTION_CLASS)}
      style={{ width: open ? OUTLINE_WIDTH : 0 }}
    >
      <OutlineBody {...rest} />
    </aside>
  );
}
