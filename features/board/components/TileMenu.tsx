"use client";

/**
 * TileMenu — the tile's ONE menu ("…"), on every tile in every layout. It holds what used to be a row
 * of buttons: what the tile is ("Table · Colors"), Comment (with its count), Open, Full screen, then
 * the item type's own entries (`BoardItemType.menuActions`). A comment count above zero shows on the
 * "…" itself, so comments are never hidden behind it. Comment opens the tile's thread anchored to the
 * menu button.
 */

import { type ReactNode, useState } from "react";
import { ExternalLink, Maximize2, MessageSquare, Minimize2, MoreHorizontal } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@ai-matrx/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TileMenuAction } from "../items/types";

export interface TileMenuComment {
  /** Comments on the tile's thread; null while unknown (never loaded). */
  count: number | null;
  /** The thread itself (shown in the popover). */
  thread: ReactNode;
  /** One short line above the thread (where these comments are kept). */
  note?: string;
}

export interface TileMenuProps {
  title: string;
  /** The item type's name ("Table"). */
  typeLabel?: string;
  /** Where Open goes (a new tab); absent = the item has no page. */
  href?: string | null;
  comment?: TileMenuComment | null;
  /** The type's own entries (`BoardItemType.menuActions`). */
  actions?: readonly TileMenuAction[];
  focused: boolean;
  onFullScreen: () => void;
  /** Drawn over the body's top right (a headerless tile): shown on hover and keyboard focus. */
  floating?: boolean;
}

/** The menu's rows in order — the contract the tests read (keys only). */
export function tileMenuKeys({ href, comment, actions }: Pick<TileMenuProps, "href" | "comment" | "actions">): string[] {
  return [
    ...(comment ? ["comment"] : []),
    ...(href ? ["open"] : []),
    "fullscreen",
    ...(actions ?? []).map((a) => `type:${a.key}`),
  ];
}

export function TileMenu({ title, typeLabel, href, comment, actions = [], focused, onFullScreen, floating = false }: TileMenuProps) {
  const [threadOpen, setThreadOpen] = useState(false);
  const [openingThread, setOpeningThread] = useState(false);
  const count = comment?.count ?? 0;
  const label = typeLabel ? `${typeLabel} · ${title}` : title;
  return (
    <Popover open={threadOpen} onOpenChange={setThreadOpen}>
      <DropdownMenu modal={false}>
        <PopoverAnchor asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-board-tile-menu
              aria-label={count > 0 ? `${title} menu, ${count} comments` : `${title} menu`}
              title="More"
              className={cn(
                "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
                floating && "border border-border bg-card shadow-sm",
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
              {count > 0 && (
                <span
                  data-board-tile-comment-count={count}
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                >
                  {count}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
        </PopoverAnchor>
        <DropdownMenuContent
          align="end"
          className="min-w-52"
          onClick={(e) => e.stopPropagation()}
          onCloseAutoFocus={(e) => {
            // Opening the thread: the focus stays with the popover, not back on the trigger.
            if (openingThread) {
              e.preventDefault();
              setOpeningThread(false);
            }
          }}
        >
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {comment && (
            <DropdownMenuItem
              data-board-menu-action="comment"
              onSelect={() => {
                setOpeningThread(true);
                setThreadOpen(true);
              }}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="flex-1">Comment</span>
              {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
            </DropdownMenuItem>
          )}
          {href && (
            <DropdownMenuItem data-board-menu-action="open" onSelect={() => window.open(href, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-4 w-4" />
              Open
            </DropdownMenuItem>
          )}
          <DropdownMenuItem data-board-menu-action="fullscreen" onSelect={onFullScreen}>
            {focused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {focused ? "Back to board" : "Full screen"}
          </DropdownMenuItem>
          {actions.length > 0 && <DropdownMenuSeparator />}
          {actions.map((a) => (
            <DropdownMenuItem key={a.key} data-board-menu-action={`type:${a.key}`} onSelect={a.onSelect}>
              {a.icon && <a.icon className="h-4 w-4" />}
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {comment && (
        <PopoverContent sizing="content" className="max-h-96 overflow-y-auto p-3" align="end" onClick={(e) => e.stopPropagation()}>
          {comment.note ? <p className="mb-2 truncate text-xs text-muted-foreground">{comment.note}</p> : null}
          {comment.thread}
        </PopoverContent>
      )}
    </Popover>
  );
}
