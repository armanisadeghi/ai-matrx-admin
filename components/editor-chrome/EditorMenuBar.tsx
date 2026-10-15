"use client";

/**
 * Google-Sheets / Google-Docs menu bar: File · Edit · View · Insert · Format ·
 * Data · Tools · Help as plain text triggers under the title. Once one menu is
 * open, hovering another opens it (Google's behaviour). Rows come from the
 * editor's `EditorMenu[]` model; the File menu is the ONE shared file menu,
 * mounted by the host through `renderFileMenu`.
 */

import { forwardRef, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Check, MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EditorMenuContent, EditorMenuSubContent } from "./editor-menu-surface";
import { formatShortcut, type EditorMenu, type EditorMenuEntry } from "./editor-menu-model";
import { useFitCount } from "./useFitCount";

/**
 * Google returns the caret to the document after a menu or toolbar choice.
 * Radix would focus the trigger instead (and Univer would stop hearing keys), so
 * the element that had focus before a menu opened gets it back on close — but only
 * once NO menu is open. Moving from one menu to the next (File → Edit by pointer or
 * arrow key) closes the first while the second opens; focusing the document then
 * would read as a click outside the new menu and close it at once.
 */
let focusBeforeMenu: HTMLElement | null = null;
export function rememberEditorFocus() {
  const el = document.activeElement;
  if (el instanceof HTMLElement && el !== document.body && !el.closest("[data-editor-menubar],[data-editor-toolbar],[data-editor-ribbon],[role=menu]")) focusBeforeMenu = el;
}
/** True while any dropdown (or a menu bar trigger) is open. */
export function anyEditorMenuOpen(): boolean {
  return !!document.querySelector('[role=menu][data-state="open"],[data-editor-menubar-trigger][data-state="open"]');
}
/** True while a dialog or floating window (opened from a menu row) is on screen. */
function anyDialogOpen(): boolean {
  return !!document.querySelector('[role=dialog][data-state="open"],[role=alertdialog][data-state="open"],[role=dialog]:not([data-state])');
}
let pendingRestore: { stop: () => void } | null = null;
function restoreNow() {
  const el = focusBeforeMenu;
  if (!el || !el.isConnected) return;
  if (anyEditorMenuOpen() || anyDialogOpen()) return;
  // Something else (a window's field, a dialog's input) already holds the caret: leave it.
  const active = document.activeElement;
  if (active && active !== document.body && !active.closest("[data-editor-menubar],[data-editor-toolbar],[data-editor-ribbon],[role=dialog],[role=alertdialog]")) return;
  el.focus({ preventScroll: true });
}
/**
 * The caret goes back to the document only when every menu is closed AND no dialog opened
 * from a menu row is open. A dialog (its chunk may mount a moment after the menu closes) keeps
 * focus, so Escape and its X close it; once it is gone the caret returns to the document.
 */
export function restoreEditorFocus(e: Event) {
  e.preventDefault();
  pendingRestore?.stop();
  // A dialog opened by the chosen row may already be mounted by now.
  let sawDialog = anyDialogOpen();
  let settle: ReturnType<typeof setTimeout> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const mo = new MutationObserver(() => {
    if (typeof document === "undefined") return stop();
    if (anyEditorMenuOpen()) return stop();
    if (anyDialogOpen()) {
      sawDialog = true;
      clearTimeout(timer);
      clearTimeout(settle);
    } else if (sawDialog) {
      // Radix hands focus back to the (gone) menu row first; take it after that.
      clearTimeout(settle);
      settle = setTimeout(() => {
        restoreNow();
        stop();
      }, 80);
    }
  });
  if (!sawDialog) timer = setTimeout(() => stop(), 3000);
  function stop() {
    mo.disconnect();
    clearTimeout(timer);
    clearTimeout(settle);
    if (pendingRestore?.stop === stop) pendingRestore = null;
  }
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
  pendingRestore = { stop };
  // Radix fires this before a menu row's dialog has mounted; give React two frames.
  requestAnimationFrame(() => requestAnimationFrame(restoreNow));
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
          <EditorMenuSubContent className="max-h-[70vh] min-w-[13rem] overflow-y-auto">
            {renderMenuEntries(e.items, `${e.id}/`)}
          </EditorMenuSubContent>
        </DropdownMenuSub>
      );
    }
    const Icon = e.icon;
    const checked = e.checked?.();
    return (
      <DropdownMenuItem
        key={e.id}
        data-editor-command={e.id}
        {...(e.soon ? { "data-soon": "", title: "Coming soon" } : {})}
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
  // Google: ← / → in an open menu (not on a submenu row) moves to the neighbouring menu.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      const menu = target?.closest('[role="menu"]');
      if (!target || !menu) return;
      // Only the top-level menu of a menu bar trigger travels; a submenu handles its own arrows.
      const owner = document.getElementById(menu.getAttribute("aria-labelledby") ?? "");
      if (!owner?.hasAttribute("data-editor-menubar-trigger")) return;
      if (e.key === "ArrowRight" && target.getAttribute("aria-haspopup") === "menu") return;
      const bar = owner.closest("[data-editor-menubar]");
      if (!bar) return;
      const order = [...bar.querySelectorAll<HTMLElement>("[data-editor-menubar-trigger][data-editor-menu]")]
        .filter((t) => t.dataset.editorMenu !== "more" && !t.closest("[data-fit-item].hidden"))
        .map((t) => t.dataset.editorMenu!);
      const at = order.indexOf(openId);
      if (at < 0 || order.length < 2) return;
      e.preventDefault();
      e.stopPropagation();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setOpenId(order[(at + step + order.length) % order.length]!);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [openId]);
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
  // Google's Extensions rows come from the model; the host's own tools (Google link, table
  // link…) follow them in the same menu.
  const entries: BarEntry[] = menus.map((m) =>
    m.id === "extensions" && extensions
      ? {
          id: m.id,
          label: m.label,
          kind: "extensions",
          content: (
            <>
              {renderMenuEntries(m.items, "extensions/")}
              <DropdownMenuSeparator />
              {extensions}
            </>
          ),
        }
      : { id: m.id, label: m.label, kind: "menu", menu: m },
  );
  if (extensions && !menus.some((m) => m.id === "extensions")) {
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
            <EditorMenuContent
              align="start"
              className="max-h-[75vh] min-w-[15rem] overflow-y-auto"
              onCloseAutoFocus={restoreEditorFocus}
            >
              {entryRows(m)}
            </EditorMenuContent>
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
          <EditorMenuContent align="start" className="min-w-[10rem]" onCloseAutoFocus={restoreEditorFocus}>
            {overflow.map((m) => (
              <DropdownMenuSub key={m.id}>
                <DropdownMenuSubTrigger data-editor-menu-more={m.id}>{m.label}</DropdownMenuSubTrigger>
                <EditorMenuSubContent className="max-h-[70vh] min-w-[13rem] overflow-y-auto">
                  {entryRows(m)}
                </EditorMenuSubContent>
              </DropdownMenuSub>
            ))}
          </EditorMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
