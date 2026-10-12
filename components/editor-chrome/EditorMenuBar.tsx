"use client";

/**
 * Google-Sheets / Google-Docs menu bar: File · Edit · View · Insert · Format ·
 * Data · Tools · Help as plain text triggers under the title. Once one menu is
 * open, hovering another opens it (Google's behaviour). Rows come from the
 * editor's `EditorMenu[]` model; the File menu is the ONE shared file menu,
 * mounted by the host through `renderFileMenu`.
 */

import { forwardRef, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Check, MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatShortcut, type EditorMenu, type EditorMenuEntry } from "./editor-menu-model";
import { useFitCount } from "./useFitCount";

/**
 * Google returns the caret to the document after a menu or toolbar choice.
 * Radix would focus the trigger instead (and Univer would stop hearing keys), so
 * the element that had focus before a menu opened gets it back on close.
 */
let focusBeforeMenu: HTMLElement | null = null;
export function rememberEditorFocus() {
  const el = document.activeElement;
  if (el instanceof HTMLElement && !el.closest("[data-editor-menubar],[data-editor-toolbar],[role=menu]")) focusBeforeMenu = el;
}
export function restoreEditorFocus(e: Event) {
  const el = focusBeforeMenu;
  if (!el || !el.isConnected) return;
  e.preventDefault();
  el.focus({ preventScroll: true });
}

/** The text trigger of one menu (also handed to the File menu host). */
export const MenuBarTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(function MenuBarTrigger({ className, active, ...rest }, ref) {
  return (
    // ui-exception: a menu bar label is text, not a 28px control (Google's menu bar row).
    <button
      ref={ref}
      type="button"
      data-editor-menubar-trigger=""
      onPointerDownCapture={rememberEditorFocus}
      className={cn(
        "h-6 shrink-0 rounded px-1.5 text-[13px] leading-6 text-foreground/90 outline-none hover:bg-accent focus-visible:bg-accent data-[state=open]:bg-accent",
        active && "bg-accent",
        className,
      )}
      {...rest}
    />
  );
});

/** Dropdown rows for a slice of the model (also used inside the File menu). */
export function renderMenuEntries(entries: EditorMenuEntry[], keyPrefix = ""): ReactNode {
  return entries.map((e, i) => {
    if (e.kind === "separator") return <DropdownMenuSeparator key={`${keyPrefix}sep-${i}`} />;
    if (e.kind === "submenu") {
      const Icon = e.icon;
      return (
        <DropdownMenuSub key={e.id}>
          <DropdownMenuSubTrigger data-editor-command={e.id}>
            {Icon ? <Icon className="mr-2 size-4" /> : <span className="mr-2 size-4" />}
            {e.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[70vh] min-w-[13rem] overflow-y-auto">
            {renderMenuEntries(e.items, `${e.id}/`)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }
    const Icon = e.icon;
    const checked = e.checked?.();
    return (
      <DropdownMenuItem
        key={e.id}
        data-editor-command={e.id}
        disabled={e.disabled?.() ?? false}
        onSelect={() => void Promise.resolve(e.run()).catch(() => {})}
      >
        {checked !== undefined ? (
          <Check className={cn("mr-2 size-4", !checked && "invisible")} />
        ) : Icon ? (
          <Icon className="mr-2 size-4" />
        ) : (
          <span className="mr-2 size-4" />
        )}
        {e.label}
        {e.shortcut ? <DropdownMenuShortcut>{formatShortcut(e.shortcut)}</DropdownMenuShortcut> : null}
      </DropdownMenuItem>
    );
  });
}

/** The menu bar's open state, lifted so the host can mount the shared File menu with it. */
export function useMenuBarState() {
  const [openId, setOpenId] = useState<string | null>(null);
  const change = (id: string) => (next: boolean) => setOpenId((cur) => (next ? id : cur === id ? null : cur));
  // Google: with one menu open, pointing at another opens that one instead.
  const hoverSwitch = (id: string) => () => {
    if (openId && openId !== id) setOpenId(id);
  };
  /** Props for the File menu host: the "File" trigger and its open state. */
  const fileMenuProps = (): { trigger: ReactElement; open: boolean; onOpenChange: (open: boolean) => void } => ({
    trigger: (
      <MenuBarTrigger data-editor-menu="file" onPointerEnter={hoverSwitch("file")}>
        File
      </MenuBarTrigger>
    ),
    open: openId === "file",
    onOpenChange: change("file"),
  });
  return { openId, change, hoverSwitch, fileMenuProps };
}

export type MenuBarState = ReturnType<typeof useMenuBarState>;

type BarEntry =
  | { id: string; label: string; kind: "menu"; menu: EditorMenu }
  | { id: string; label: string; kind: "extensions"; content: ReactNode };

/** Rows of one bar entry: a model menu's tree, or the host's Extensions rows. */
function entryRows(entry: BarEntry): ReactNode {
  return entry.kind === "menu" ? renderMenuEntries(entry.menu.items, `${entry.id}/`) : entry.content;
}

export function EditorMenuBar({
  menus,
  state,
  fileMenu,
  extensions,
  className,
}: {
  menus: EditorMenu[];
  state: MenuBarState;
  /** The shared File menu, mounted with `state.fileMenuProps()` (first, like Google). */
  fileMenu?: ReactNode;
  /**
   * Google's Extensions menu (before Help): the host's own tools — Google link, table
   * link, references — as dropdown rows. Omit and no Extensions menu is drawn.
   */
  extensions?: ReactNode;
  className?: string;
}) {
  const { openId, change, hoverSwitch } = state;
  const rowRef = useRef<HTMLElement | null>(null);
  const entries: BarEntry[] = menus.map((m) => ({ id: m.id, label: m.label, kind: "menu", menu: m }));
  if (extensions) {
    const help = entries.findIndex((e) => e.id === "help");
    entries.splice(help < 0 ? entries.length : help, 0, {
      id: "extensions",
      label: "Extensions",
      kind: "extensions",
      content: extensions,
    });
  }
  const fit = useFitCount(rowRef, entries.length);
  const overflow = entries.slice(fit);
  return (
    <nav
      ref={rowRef}
      aria-label="Menu bar"
      data-editor-menubar=""
      className={cn("flex min-w-0 flex-1 items-center gap-0 overflow-hidden", className)}
    >
      {fileMenu}
      {entries.map((m, index) => (
        <span key={m.id} data-fit-item={m.id} className={cn("flex shrink-0 items-center", index >= fit && "hidden")}>
          <DropdownMenu modal={false} open={openId === m.id} onOpenChange={change(m.id)}>
            <DropdownMenuTrigger asChild>
              <MenuBarTrigger data-editor-menu={m.id} onPointerEnter={hoverSwitch(m.id)}>
                {m.label}
              </MenuBarTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-[75vh] min-w-[15rem] overflow-y-auto"
              onCloseAutoFocus={restoreEditorFocus}
            >
              {entryRows(m)}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ))}
      {overflow.length > 0 ? (
        <DropdownMenu modal={false}>
          <span data-fit-more="" className="flex shrink-0 items-center">
            <DropdownMenuTrigger asChild>
              <MenuBarTrigger aria-label="More menus" title="More menus" data-editor-menu="more">
                <MoreVertical className="size-3.5" />
              </MenuBarTrigger>
            </DropdownMenuTrigger>
          </span>
          <DropdownMenuContent align="start" className="min-w-[10rem]" onCloseAutoFocus={restoreEditorFocus}>
            {overflow.map((m) => (
              <DropdownMenuSub key={m.id}>
                <DropdownMenuSubTrigger data-editor-menu-more={m.id}>{m.label}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-[70vh] min-w-[13rem] overflow-y-auto">
                  {entryRows(m)}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
