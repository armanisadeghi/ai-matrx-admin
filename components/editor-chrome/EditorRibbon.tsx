"use client";

/**
 * The Microsoft 365 look's ribbon: a tab row (File · Home · Insert · … · View · Help) over a panel
 * of labelled groups with large and small buttons — Excel / Word / PowerPoint on the web. It is a
 * second presentation of the editor's ONE command map (`ribbon-model.ts`): every control is a row
 * of the same `EditorMenu[]` / `EditorToolbarItem[]` the Google menu bar and toolbar draw, File is
 * the same shared file menu, and the Menus search sits on the tab row.
 *
 * Fixed heights (tab row 36px, panel 96px; one 44px row on a phone — Office's simplified ribbon), so
 * switching tabs or opening a dropdown never moves the canvas below.
 */

import { useState, type ReactNode } from "react";
import { ChevronDown, Puzzle } from "lucide-react";

import { Button, Tabs } from "@ai-matrx/design-system/controls";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatShortcut, type EditorMenu, type EditorMenuEntry } from "./editor-menu-model";
import { rememberEditorFocus, renderMenuEntries, restoreEditorFocus } from "./EditorMenuBar";
import { MenusSearch, type EditorToolbarItem } from "./EditorToolbar";
import {
  resolveRibbon,
  type ResolvedRibbonControl,
  type ResolvedRibbonGroup,
  type RibbonSize,
  type RibbonTabSpec,
} from "./ribbon-model";

type IconType = React.ComponentType<{ className?: string }>;

/** What one control shows and does, whatever it came from (toolbar tool, menu row, submenu). */
type ControlView = {
  key: string;
  id: string;
  label: string;
  icon?: IconType;
  /** A value-showing dropdown (font name, zoom %). */
  text?: string;
  widthClass?: string;
  title: string;
  disabled: boolean;
  pressed?: boolean;
  run?: () => unknown;
  items?: EditorMenuEntry[];
};

function viewOf(c: ResolvedRibbonControl): ControlView {
  if (c.kind === "toolbar") {
    const it = c.item;
    if (it.kind === "button")
      return {
        key: c.key,
        id: it.id,
        label: c.label ?? it.label,
        icon: c.icon ?? it.icon,
        title: it.shortcut ? `${it.label} (${formatShortcut(it.shortcut)})` : it.label,
        disabled: !!it.disabled,
        pressed: it.active,
        run: it.run,
      };
    if (it.kind === "menu")
      return {
        key: c.key,
        id: it.id,
        label: c.label ?? it.label,
        icon: c.icon ?? it.icon,
        text: it.text,
        widthClass: it.widthClass,
        title: it.label,
        disabled: !!it.disabled,
        items: it.items,
      };
    return { key: c.key, id: it.id, label: c.label ?? "", title: "", disabled: false };
  }
  if (c.kind === "action") {
    const a = c.action;
    return {
      key: c.key,
      id: a.id,
      label: c.label ?? a.label,
      icon: c.icon ?? a.icon,
      title: a.shortcut ? `${a.label} (${formatShortcut(a.shortcut)})` : a.label,
      disabled: a.disabled?.() ?? false,
      pressed: a.checked?.(),
      run: a.run,
    };
  }
  const s = c.submenu;
  return {
    key: c.key,
    id: s.id,
    label: c.label ?? s.label,
    icon: c.icon ?? s.icon,
    title: s.label,
    disabled: false,
    items: s.items,
  };
}

const runSafely = (run?: () => unknown) => void Promise.resolve(run?.()).catch(() => {});

function Dropdown({ view, trigger }: { view: ControlView; trigger: ReactNode }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={view.disabled}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70vh] min-w-[13rem] overflow-y-auto" onCloseAutoFocus={restoreEditorFocus}>
        {renderMenuEntries(view.items ?? [], `${view.key}/`)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RibbonControl({ control, size }: { control: ResolvedRibbonControl; size: RibbonSize }) {
  const view = viewOf(control);
  if (control.kind === "toolbar" && control.item.kind === "node")
    return <span className="flex shrink-0 items-center">{control.item.node}</span>;
  const Icon = view.icon;
  const isMenu = !!view.items;
  const common = {
    "aria-label": view.label,
    title: view.title,
    disabled: view.disabled,
    "data-editor-command": view.id,
    "aria-pressed": isMenu ? undefined : view.pressed,
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    ...(isMenu ? {} : { onClick: () => runSafely(view.run) }),
  };

  if (size === "large") {
    const body = (
      // ui-exception: an Office ribbon's large button (icon over a two-line label), not a 28px control.
      <button
        type="button"
        {...common}
        className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-start gap-1 rounded px-1 pt-1.5 text-xs leading-tight text-foreground hover:bg-accent disabled:opacity-50 aria-pressed:bg-accent"
      >
        {Icon ? <Icon className="size-6 text-[var(--office-accent,currentColor)]" /> : null}
        <span className="line-clamp-2 text-center">
          {view.label}
          {isMenu ? <ChevronDown className="ml-0.5 inline size-3 text-muted-foreground" /> : null}
        </span>
      </button>
    );
    return isMenu ? <Dropdown view={view} trigger={body} /> : body;
  }

  if (size === "small") {
    const body = (
      // ui-exception: an Office ribbon's small row button (icon + label), three stacked per column.
      <button
        type="button"
        {...common}
        className="flex h-6 max-w-[11rem] shrink-0 items-center gap-1.5 rounded px-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-50 aria-pressed:bg-accent"
      >
        {Icon ? <Icon className="size-4 shrink-0" /> : <span className="size-4 shrink-0" />}
        <span className="truncate">{view.label}</span>
        {isMenu ? <ChevronDown className="size-3 shrink-0 text-muted-foreground" /> : null}
      </button>
    );
    return isMenu ? <Dropdown view={view} trigger={body} /> : body;
  }

  // icon: a tool in a row (Office's Font group) — the toolbar's own geometry.
  if (isMenu && (view.text !== undefined || !Icon)) {
    return (
      <Dropdown
        view={view}
        trigger={
          // ui-exception: a value-showing ribbon dropdown (font name, size, zoom %) — Office's combo boxes.
          <button
            type="button"
            {...common}
            className={cn(
              "flex h-7 shrink-0 items-center justify-between gap-1 rounded border border-border/70 bg-background px-1.5 text-xs hover:bg-accent disabled:opacity-50",
              view.widthClass,
            )}
          >
            <span className="truncate">{view.text ?? view.label}</span>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </button>
        }
      />
    );
  }
  const button = (
    <Button
      variant="quiet"
      icon={Icon ? <Icon /> : undefined}
      {...common}
      className="shrink-0"
    >
      {Icon ? undefined : view.label}
    </Button>
  );
  return isMenu ? <Dropdown view={view} trigger={button} /> : button;
}

/** Office's group layout: large controls take a column; small ones stack three to a column; icon tools flow in rows. */
function columnsOf(group: ResolvedRibbonGroup, compact: boolean) {
  type Column = { kind: "large" | "small" | "icons"; controls: ResolvedRibbonControl[] };
  const cols: Column[] = [];
  for (const c of group.controls) {
    const size: RibbonSize = compact ? "icon" : c.size;
    const last = cols[cols.length - 1];
    if (size === "large") cols.push({ kind: "large", controls: [c] });
    else if (size === "small") {
      if (last?.kind === "small" && last.controls.length < 3) last.controls.push(c);
      else cols.push({ kind: "small", controls: [c] });
    } else if (last?.kind === "icons") last.controls.push(c);
    else cols.push({ kind: "icons", controls: [c] });
  }
  return cols;
}

function RibbonGroup({ group, compact }: { group: ResolvedRibbonGroup; compact: boolean }) {
  const cols = columnsOf(group, compact);
  return (
    <div
      role="group"
      aria-label={group.label}
      data-ribbon-group={group.id}
      className={cn("flex shrink-0 flex-col border-r border-border/70 px-1.5 last:border-r-0", compact && "border-r-0 px-0.5")}
    >
      <div className="flex min-h-0 flex-1 items-start gap-1">
        {cols.map((col, i) => {
          if (col.kind === "large") return <RibbonControl key={col.controls[0]!.key} control={col.controls[0]!} size="large" />;
          if (col.kind === "small")
            return (
              <div key={`s-${i}`} className="flex flex-col">
                {col.controls.map((c) => (
                  <RibbonControl key={c.key} control={c} size="small" />
                ))}
              </div>
            );
          const rows: ResolvedRibbonControl[][] = [];
          const per = compact ? Number.POSITIVE_INFINITY : group.perRow;
          for (const c of col.controls) {
            const row = rows[rows.length - 1];
            if (row && row.length < per) row.push(c);
            else rows.push([c]);
          }
          return (
            <div key={`i-${i}`} className="flex flex-col gap-0.5 pt-0.5">
              {rows.map((row, r) => (
                <div key={r} className="flex items-center gap-0.5">
                  {row.map((c) => (
                    <RibbonControl key={c.key} control={c} size="icon" />
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {compact ? null : (
        <div className="h-4 truncate text-center text-xs leading-4 text-muted-foreground">{group.label}</div>
      )}
    </div>
  );
}

export function EditorRibbon({
  tabs,
  menus,
  toolbar,
  fileMenu,
  extensions,
  end,
  className,
}: {
  tabs: RibbonTabSpec[];
  menus: EditorMenu[];
  toolbar: EditorToolbarItem[];
  /** The shared File menu (its trigger reads "File"), first on the tab row like Office's File tab. */
  fileMenu?: ReactNode;
  /**
   * The host's own tools (Google link, table link, references) as dropdown rows — the Google menu
   * bar's Extensions menu; here Office's Add-ins button at the end of Home.
   */
  extensions?: ReactNode;
  /** Trailing content of the tab row (the page's own trailing tools, the look switch). */
  end?: ReactNode;
  className?: string;
}) {
  const compact = useIsMobile();
  const resolved = resolveRibbon(tabs, menus, toolbar);
  const [tabId, setTabId] = useState("home");
  const active = resolved.find((t) => t.id === tabId) ?? resolved[0];

  return (
    <div
      data-editor-ribbon=""
      data-editor-toolbar=""
      onPointerDownCapture={rememberEditorFocus}
      className={cn("matrx-touch-targets shrink-0 border-b border-border bg-card", className)}
    >
      <div className="flex h-9 items-center gap-0.5 px-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {fileMenu ? <span className="flex shrink-0 items-center">{fileMenu}</span> : null}
          {active ? (
            <Tabs
              aria-label="Ribbon"
              value={active.id}
              onValueChange={setTabId}
              data={resolved.map((t) => ({ value: t.id, label: t.label }))}
              rule={false}
              className="shrink-0"
            />
          ) : null}
        </div>
        <MenusSearch menus={menus} className="hidden sm:block" />
        {end ? <span className="ml-1 hidden shrink-0 items-center md:flex">{end}</span> : null}
      </div>
      {active ? (
        <div
          role="tabpanel"
          aria-label={active.label}
          data-ribbon-panel={active.id}
          className={cn(
            "flex items-stretch overflow-x-auto px-2 [scrollbar-width:none]",
            compact ? "h-11 items-center gap-0.5" : "h-24 py-1",
          )}
        >
          {active.groups.map((g) => (
            <RibbonGroup key={g.id} group={g} compact={compact} />
          ))}
          {extensions && active.id === "home" ? (
            <div role="group" aria-label="Add-ins" data-ribbon-group="add-ins" className="flex shrink-0 flex-col px-1.5">
              <div className="flex min-h-0 flex-1 items-start">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    {/* ui-exception: an Office ribbon's large button (icon over a label), not a 28px control. */}
                    <button
                      type="button"
                      aria-label="Add-ins"
                      title="Add-ins"
                      data-editor-command="extensions"
                      onMouseDown={(e) => e.preventDefault()}
                      className={cn(
                        "flex shrink-0 items-center rounded text-foreground hover:bg-accent",
                        compact
                          ? "h-7 gap-1 px-1.5 text-xs"
                          : "h-[4.5rem] w-[4.5rem] flex-col justify-start gap-1 px-1 pt-1.5 text-xs leading-tight",
                      )}
                    >
                      <Puzzle className={cn("text-[var(--office-accent,currentColor)]", compact ? "size-4" : "size-6")} />
                      <span>Add-ins</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[14rem]" onCloseAutoFocus={restoreEditorFocus}>
                    {extensions}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {compact ? null : <div className="h-4 text-center text-xs leading-4 text-muted-foreground">Add-ins</div>}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={compact ? "h-11" : "h-24"} />
      )}
    </div>
  );
}
