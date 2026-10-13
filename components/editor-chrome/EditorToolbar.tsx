"use client";

/**
 * Google's second row: the "Menus" search first, then icon groups (undo, redo,
 * print, paint format, zoom, formats, font, size, B/I/S, colours, borders,
 * merge, align, wrap, rotate, link, comment, filter, functions). One row that
 * scrolls sideways on narrow screens — it never wraps, so nothing below moves.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, MoreVertical, Search } from "lucide-react";

import { Button } from "@ai-matrx/design-system/controls";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EditorMenuContent, EditorMenuSubContent } from "./editor-menu-surface";
import {
  flattenMenus,
  formatShortcut,
  searchActions,
  type EditorMenu,
  type EditorMenuEntry,
  type EditorShortcut,
} from "./editor-menu-model";
import { rememberEditorFocus, renderMenuEntries, restoreEditorFocus } from "./EditorMenuBar";
import { useFitCount } from "./useFitCount";

type IconType = React.ComponentType<{ className?: string }>;

export type EditorToolbarItem =
  | {
      kind: "button";
      id: string;
      label: string;
      icon: IconType;
      run: () => unknown;
      shortcut?: EditorShortcut;
      active?: boolean;
      disabled?: boolean;
    }
  | { kind: "separator"; id: string }
  | {
      kind: "menu";
      id: string;
      label: string;
      icon?: IconType;
      /** Text shown on the trigger (e.g. "100%", "Arial"). */
      text?: string;
      /** Trigger width class for text triggers (keeps the row still as text changes). */
      widthClass?: string;
      items: EditorMenuEntry[];
      disabled?: boolean;
    }
  | { kind: "node"; id: string; node: ReactNode };

/** Google's "Menus" box: type to find any command in the menu tree. */
export function MenusSearch({ menus, className }: { menus: EditorMenu[]; className?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const results = searchActions(flattenMenus(menus), query);
  const showing = open && query.trim().length > 0;

  // The list is a portal (the toolbar clips its own overflow): follow the box while it is open.
  useEffect(() => {
    if (!showing) return;
    const place = () => setAnchor(inputRef.current?.getBoundingClientRect() ?? null);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [showing]);

  // Google: Alt+/ jumps to the Menus search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === "Slash") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const runAt = (i: number) => {
    const a = results[i];
    if (!a || a.disabled?.()) return;
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    void Promise.resolve(a.run()).catch(() => {});
  };

  return (
    <div className={cn("relative shrink-0", className)} data-editor-menus-search="">
      <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      {/* ui-exception: a command-palette box inside a dense toolbar (Google's "Menus"), not a form field. */}
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, Math.max(results.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            runAt(cursor);
          } else if (e.key === "Escape") {
            setQuery("");
            inputRef.current?.blur();
          }
        }}
        placeholder="Menus"
        aria-label="Search the menus"
        className="h-7 w-[7.5rem] rounded-full bg-muted/70 pl-7 pr-2 text-[13px] outline-none placeholder:text-muted-foreground focus:bg-background focus:ring-1 focus:ring-ring"
      />
      {open && query.trim() && anchor
        ? createPortal(
            <div
              role="listbox"
              aria-label="Menu search results"
              data-editor-menus-results=""
              style={{ position: "fixed", left: anchor.left, top: anchor.bottom + 4 }}
              className="z-[200] max-h-[60vh] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {results.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No menu item matches</div>
              ) : (
                results.map((a, i) => (
                  <button
                    key={`${a.path.join("/")}/${a.id}`}
                    type="button"
                    role="option"
                    aria-selected={i === cursor}
                    data-editor-command={a.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => runAt(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px]",
                      i === cursor && "bg-accent",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{a.label}</span>
                    <span className="shrink-0 truncate text-[11px] text-muted-foreground">{a.path.join(" › ")}</span>
                    {a.shortcut ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">{formatShortcut(a.shortcut)}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** The items past the fit, as Google's "⋮ more" menu rows. */
function renderOverflowItems(items: EditorToolbarItem[]): ReactNode {
  return items.map((it, i) => {
    if (it.kind === "separator") return <DropdownMenuSeparator key={`${it.id}-${i}`} />;
    if (it.kind === "node") return null;
    const Icon = it.icon;
    if (it.kind === "button") {
      return (
        <DropdownMenuItem
          key={it.id}
          data-editor-command={`more:${it.id}`}
          disabled={it.disabled}
          onSelect={() => void Promise.resolve(it.run()).catch(() => {})}
        >
          {Icon ? <Icon className="mr-2 size-4" /> : <span className="mr-2 size-4" />}
          {it.label}
          {it.shortcut ? <span className="ml-auto pl-4 text-xs text-muted-foreground">{formatShortcut(it.shortcut)}</span> : null}
        </DropdownMenuItem>
      );
    }
    return (
      <DropdownMenuSub key={it.id}>
        <DropdownMenuSubTrigger data-editor-command={`more:${it.id}`} disabled={it.disabled}>
          {Icon ? <Icon className="mr-2 size-4" /> : <span className="mr-2 size-4" />}
          {it.label}
        </DropdownMenuSubTrigger>
        <EditorMenuSubContent className="max-h-[70vh] min-w-[12rem] overflow-y-auto">
          {renderMenuEntries(it.items, `${it.id}/`)}
        </EditorMenuSubContent>
      </DropdownMenuSub>
    );
  });
}

export function EditorToolbar({
  items,
  menus,
  trailing,
  className,
}: {
  items: EditorToolbarItem[];
  /** The menu tree the Menus search reads. */
  menus: EditorMenu[];
  /** A fixed control at the row's far end (never folded into "more"). */
  trailing?: ReactNode;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const fit = useFitCount(rowRef, items.length);
  // Never end the visible run on a divider.
  let shown = fit;
  while (shown > 0 && items[shown - 1]?.kind === "separator") shown -= 1;
  const overflow = items.slice(shown);
  const hasOverflow = overflow.some((it) => it.kind !== "separator");

  return (
    <div
      ref={rowRef}
      role="toolbar"
      aria-label="Editing tools"
      data-editor-toolbar=""
      onPointerDownCapture={rememberEditorFocus}
      className={cn(
        "matrx-touch-targets mx-2 mb-1 flex h-10 shrink-0 items-center gap-0.5 overflow-hidden rounded-full bg-muted/50 px-1.5",
        className,
      )}
    >
      <MenusSearch menus={menus} />
      {items.map((it, index) => {
        const hidden = index >= shown;
        const wrap = (child: ReactNode) => (
          <span
            key={it.id}
            data-fit-item={it.id}
            className={cn("flex shrink-0 items-center", hidden && "hidden")}
          >
            {child}
          </span>
        );
        if (it.kind === "separator") return wrap(<span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />);
        if (it.kind === "node") return wrap(it.node);
        if (it.kind === "button") {
          const Icon = it.icon;
          const title = it.shortcut ? `${it.label} (${formatShortcut(it.shortcut)})` : it.label;
          return wrap(
            <Button
              variant="quiet"
              icon={<Icon />}
              aria-label={it.label}
              title={title}
              aria-pressed={it.active === undefined ? undefined : it.active}
              disabled={it.disabled}
              data-editor-command={it.id}
              className="shrink-0 aria-pressed:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void Promise.resolve(it.run()).catch(() => {})}
            />,
          );
        }
        const Icon = it.icon;
        return wrap(
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              {it.text !== undefined ? (
                // ui-exception: a value-showing toolbar trigger (zoom %, font name) — Google's text dropdowns.
                <button
                  type="button"
                  aria-label={it.label}
                  title={it.label}
                  disabled={it.disabled}
                  data-editor-command={it.id}
                  className={cn(
                    "flex h-7 shrink-0 items-center justify-between gap-1 rounded px-1.5 text-[13px] hover:bg-accent disabled:opacity-50",
                    it.widthClass,
                  )}
                >
                  <span className="truncate">{it.text}</span>
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                </button>
              ) : (
                <Button
                  variant="quiet"
                  icon={Icon ? <Icon /> : undefined}
                  aria-label={it.label}
                  title={it.label}
                  disabled={it.disabled}
                  data-editor-command={it.id}
                  className="shrink-0"
                />
              )}
            </DropdownMenuTrigger>
            <EditorMenuContent
              align="start"
              className="max-h-[70vh] min-w-[12rem] overflow-y-auto"
              onCloseAutoFocus={restoreEditorFocus}
            >
              {renderMenuEntries(it.items, `${it.id}/`)}
            </EditorMenuContent>
          </DropdownMenu>,
        );
      })}
      {hasOverflow ? (
        <DropdownMenu modal={false}>
          <span data-fit-more="" className="flex shrink-0 items-center">
            <DropdownMenuTrigger asChild>
              <Button
                variant="quiet"
                icon={<MoreVertical />}
                aria-label="More"
                title="More"
                data-editor-command="tb.more"
                className="shrink-0"
              />
            </DropdownMenuTrigger>
          </span>
          <EditorMenuContent
            align="end"
            className="max-h-[70vh] min-w-[13rem] overflow-y-auto"
            onCloseAutoFocus={restoreEditorFocus}
          >
            {renderOverflowItems(overflow)}
          </EditorMenuContent>
        </DropdownMenu>
      ) : null}
      {trailing ? <span className="ml-auto flex shrink-0 items-center pl-1">{trailing}</span> : null}
    </div>
  );
}
