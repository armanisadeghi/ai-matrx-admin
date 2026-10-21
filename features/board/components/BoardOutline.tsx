"use client";

/**
 * BoardOutline — the board's left rail: its CHAPTERS (the frames, in reading order; click flies to
 * one, the one being read is highlighted as the view moves) and its PAGES (the board's sub-boards:
 * the top board and every page under it; "Add page" makes one and opens it). Shown by default in
 * page layout, a toggle on the canvas; on a phone it is a bottom drawer.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  Blend,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Component,
  FileText,
  Folder,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  type LucideIcon,
  MoveHorizontal,
  NotebookText,
  Palette,
  PanelLeftClose,
  Pencil,
  Plus,
  Ruler,
  SquareDashed,
  Type,
} from "lucide-react";
import { ErrorNotice, PANEL_MOTION_CLASS } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import type { BoardCameraStore } from "../engine/camera-store";
import { screenToWorld } from "../engine/camera";
import { frameKey } from "../engine/selection";
import { activeChapter, chapterOrder, type BoardLayoutMode } from "../engine/page-layout";
import type { BoardFrame } from "../board/board-store";
import { CHAPTER_FALLBACK_ICON, pageIconName } from "../engine/tile-chrome";

/** The chapter icons the outline draws by name (`engine/tile-chrome.ts` names them; a static map keeps the bundle small). */
const CHAPTER_ICONS: Readonly<Record<string, LucideIcon>> = {
  Palette,
  Type,
  Ruler,
  MoveHorizontal,
  SquareDashed,
  Layers,
  Blend,
  Activity,
  Component,
  Folder,
  NotebookText,
  Bookmark,
  FileText,
  LayoutDashboard,
};

/** A chapter's icon: a name from the map, or an item type's own icon component; anything else the neutral one. */
export type ChapterIcon = string | LucideIcon;
function iconFor(icon: ChapterIcon | undefined): LucideIcon {
  const fallback = CHAPTER_ICONS[CHAPTER_FALLBACK_ICON];
  if (icon === undefined) return fallback;
  return typeof icon === "string" ? (CHAPTER_ICONS[icon] ?? fallback) : icon;
}

/** A page row's icon: the top board and the pages under it never share one. */
function PageRowIcon({ parentId }: { parentId: string | null }) {
  const Icon = iconFor(pageIconName({ parentId }));
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}

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
  /** Rename a chapter from the rail (double-click its row, or its pencil): the frame's own title. Absent = not renamable here. */
  onRenameChapter?: (id: string, title: string) => void;
  /** Page layout only: a chapter's top as planned for this view (runs a waiting re-flow first). */
  chapterTop?: (id: string) => number | null;
  /** Each chapter's own icon, by frame id (`chapterIconName`); absent = the neutral icon. */
  chapterIcons?: Readonly<Record<string, ChapterIcon>>;
  onClose: () => void;
}

/** The chapter being read: in page layout the last one whose top passed the upper third; on the canvas the one under the view's center. */
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

function OutlineBody({ frames, store, layout, pages, onMoveChapter, onRenameChapter, chapterTop, chapterIcons, onClose, fill = false }: OutlineProps & { fill?: boolean }) {
  const chapters = chapterOrder(frames);
  const { active, pin } = useActiveChapter(store, chapters, layout);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const go = (f: BoardFrame) => {
    if (!store) return;
    pin(f.id);
    // The planned top, never a stale one: after a width change the page may still be re-flowing.
    if (layout === "page") store.pageScrollTo((chapterTop?.(f.id) ?? f.rect.y) - 56);
    else store.fitItem(frameKey(f.id), 48);
    store.select(f.id);
    if (fill) onClose(); // the phone's drawer steps aside to show the chapter
  };
  return (
    <div className="flex h-full min-h-0 flex-col" style={fill ? undefined : { width: OUTLINE_WIDTH }}>
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border pl-3 pr-1.5">
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
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5" data-board-outline>
        <div className="flex h-6 items-center px-2 text-[11px] font-medium text-muted-foreground">Chapters</div>
        {chapters.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Add a frame to start a chapter</div>
        ) : (
          <ul className="flex flex-col">
            {chapters.map((f, i) => {
              const Icon = iconFor(chapterIcons?.[f.id]);
              return (
              <li key={f.id} className="group relative">
                {renamingId === f.id && onRenameChapter ? (
                  <div className="flex h-7 w-full items-center gap-2 rounded-md bg-accent px-2">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {/* ui-exception: a chapter's name typed in place in the rail (as on the frame); a raw short name */}
                    <input
                      aria-label="Chapter name"
                      autoFocus
                      defaultValue={f.title}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => {
                        const next = e.currentTarget.value.trim();
                        setRenamingId(null);
                        if (next && next !== f.title) onRenameChapter(f.id, next);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") e.currentTarget.blur();
                        else if (e.key === "Escape") {
                          e.currentTarget.value = f.title ?? "";
                          e.currentTarget.blur();
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-primary bg-background px-1 text-[13px] text-foreground outline-none"
                    />
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={() => go(f)}
                  onDoubleClick={onRenameChapter ? () => setRenamingId(f.id) : undefined}
                  aria-current={active === f.id ? "true" : undefined}
                  data-board-chapter-icon={typeof chapterIcons?.[f.id] === "string" ? chapterIcons?.[f.id] : "type"}
                  className={cn(
                    "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px]",
                    active === f.id ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{f.title || "Untitled frame"}</span>
                </button>
                )}
                {renamingId !== f.id && (onRenameChapter || (onMoveChapter && chapters.length > 1)) && (
                  <span className="absolute right-0.5 top-1/2 hidden -translate-y-1/2 items-center group-hover:flex group-focus-within:flex pointer-coarse:flex">
                    {onRenameChapter && (
                      <button
                        type="button"
                        onClick={() => setRenamingId(f.id)}
                        title="Rename"
                        aria-label={`Rename ${f.title || "frame"}`}
                        className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {onMoveChapter && chapters.length > 1 && (<>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => onMoveChapter(f.id, -1)}
                      title="Move up"
                      aria-label={`Move ${f.title || "frame"} up`}
                      className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground disabled:text-disabled-foreground"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === chapters.length - 1}
                      onClick={() => onMoveChapter(f.id, 1)}
                      title="Move down"
                      aria-label={`Move ${f.title || "frame"} down`}
                      className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground disabled:text-disabled-foreground"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    </>)}
                  </span>
                )}
              </li>
              );
            })}
          </ul>
        )}
        {pages && (
          <>
            <div className="mt-2 flex h-6 items-center justify-between pl-2">
              <span className="text-[11px] font-medium text-muted-foreground">Pages</span>
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
              <ul className="flex flex-col">
                {pages.list.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/board/${p.id}`}
                      aria-current={p.id === pages.currentId ? "page" : undefined}
                      className={cn(
                        "flex h-7 w-full items-center gap-2 rounded-md pr-2 text-[13px]",
                        // A child page sits one half-step in (8px), never a full icon-width.
                        p.parentId ? "pl-4" : "pl-2",
                        p.id === pages.currentId ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <PageRowIcon parentId={p.parentId} />
                      <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={pages.onAdd}
                    disabled={pages.adding}
                    className="flex h-7 w-full items-center gap-2 rounded-md pl-4 pr-2 text-left text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:text-disabled-foreground"
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
