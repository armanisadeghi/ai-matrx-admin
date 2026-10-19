"use client";

// features/spaces/data/menu-parts.tsx — the small pieces every database block's toolbar shares: a view
// tab (rename / duplicate / delete), a menu row, a field list.

import { ErrorNotice, Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Badge, Button, Input } from "@ai-matrx/design-system/controls";
import { ChevronDown, Copy, FileText, Star, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { NewRowPick, RowTemplateChoice } from "./row-templates";
import type { SpaceDbView } from "./sources";

/**
 * Brings `el` into view inside its nearest HORIZONTALLY scrolling ancestor (a tab strip), moving that strip's
 * scrollLeft only. The page, the window and any vertical scroller are never moved.
 */
export function revealInStrip(el: HTMLElement): void {
  let strip = el.parentElement;
  while (strip) {
    const x = getComputedStyle(strip).overflowX;
    if ((x === "auto" || x === "scroll") && strip.scrollWidth > strip.clientWidth) break;
    strip = strip.parentElement;
  }
  if (!strip) return;
  const s = strip.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.left < s.left) strip.scrollLeft -= s.left - r.left;
  else if (r.right > s.right) strip.scrollLeft += r.right - s.right;
}

export function ViewTab({
  view,
  icon,
  active,
  editable,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  pill,
}: {
  view: SpaceDbView;
  icon: ReactNode;
  pill?: boolean;
  active: boolean;
  editable: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState(view.name);
  // The open tab stays in view when the strip scrolls (more views than the block is wide) — by scrolling THE STRIP
  // only. Never scrollIntoView: it scrolls every scrollable ancestor, so each database block's open tab dragged
  // the page down to itself on mount and every Spaces page opened part-way down (ADVERSARIAL-3 D4).
  const openTab = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (active && openTab.current) revealInStrip(openTab.current);
  }, [active]);
  return (
    <Popover open={menu} onOpenChange={(o) => (editable ? setMenu(o) : null)}>
      <PopoverTrigger asChild>
        {pill || active ? (
          // A chart tile's title is the tile's own layout (Notion's gray pill), not a toolbar control;
          // the open view of a table sits in the same gray pill (screenshot 1's "All").
          <button ref={openTab} type="button" className={pill ? "spaces-chart-title" : "spaces-chart-title spaces-view-pill"} role="tab" aria-selected={active} title={view.name}>
            {icon}
            <span>{view.name}</span>
          </button>
        ) : (
          <Button variant="quiet" role="tab" aria-selected={active} data-active={active ? "true" : undefined} onClick={(e) => {
              if (!active) {
                e.preventDefault();
                onSelect();
              }
            }}>
            {icon}
            <span>{view.name}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent surface="solid" align="start" width="sm" padding="xs">
        <div className="p-1">
          <Input
            value={name}
            aria-label="View name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(name.trim() || view.name);
                setMenu(false);
              }
            }}
            onBlur={() => name.trim() && name !== view.name && onRename(name.trim())}
          />
        </div>
        <MenuRow icon={<Copy size={15} />} label="Duplicate view" onClick={() => (onDuplicate(), setMenu(false))} />
        {onDelete ? <MenuRow icon={<Trash2 size={15} />} label="Delete view" onClick={() => (onDelete(), setMenu(false))} /> : null}
      </PopoverContent>
    </Popover>
  );
}

export function MenuRow({ icon, label, onClick, end, active }: { icon?: ReactNode; label: string; onClick: () => void; end?: ReactNode; active?: boolean }) {
  return (
    // A row may end in a Switch (itself a button), so the row is a focusable div, never a <button>.
    <div
      role="button"
      tabIndex={0}
      className="spaces-db-menurow"
      data-active={active ? "true" : undefined}
      data-clickable=""
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {icon ? <span className="spaces-db-menuicon">{icon}</span> : null}
      <span className="flex-1 truncate text-left">{label}</span>
      {end}
    </div>
  );
}

export function FieldList<F extends { key: string; label: string }>({ fields, value, onPick, filter }: { fields: F[]; value?: string | null; onPick: (key: string) => void; filter?: (f: F) => boolean }) {
  return (
    <div className="max-h-[260px] overflow-y-auto">
      {fields.filter(filter ?? (() => true)).map((f) => (
        <MenuRow key={f.key} label={f.label} active={f.key === value} onClick={() => onPick(f.key)} />
      ))}
    </div>
  );
}

export type ViewSort = { field: string; direction: "asc" | "desc" };
/** A viewer's own sort for one view: `undefined` follows the saved sort; `null` = "no sort" for them. */
export type SortChoice = ViewSort | null | undefined;

/** The sort a view is drawn with: the viewer's choice when they made one, else the view's saved sort. */
export function shownSorts(view: SpaceDbView, choice: SortChoice): ViewSort[] {
  if (choice === undefined) return view.sorts ?? [];
  return choice ? [choice] : [];
}

/** A viewer's own filters for one view: `undefined` follows the saved filters. */
export type FilterChoice = SpaceDbView["filters"] | undefined;
type Filters = NonNullable<SpaceDbView["filters"]>;

/** The filters a view is drawn with: the viewer's own when they changed them, else the view's saved ones. */
export function shownFilters(view: SpaceDbView, choice: FilterChoice): Filters {
  return choice === undefined ? (view.filters ?? {}) : choice;
}

/** True when the viewer's filters differ from the view's saved ones. */
export function filtersDiffer(view: SpaceDbView, choice: FilterChoice): boolean {
  return choice !== undefined && JSON.stringify(choice) !== JSON.stringify(view.filters ?? {});
}

/**
 * Notion's footer under a changed filter or sort: "Reset" for everyone, "Save for everyone" for a person
 * who may edit the view. Until then the change is the viewer's alone.
 */
export function ViewerSaveBar({ canSave, onReset, onSave }: { canSave: boolean; onReset: () => void; onSave: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1 border-t border-border p-1">
      <Button variant="quiet" onClick={onReset}>
        Reset
      </Button>
      {canSave ? (
        <Button variant="primary" onClick={onSave}>
          Save for everyone
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The toolbar sort (Notion): anyone may sort, it applies at once, and it is that viewer's alone — never
 * written to the view. A person who may edit the view sees "Save for everyone" and "Reset" once their sort
 * differs from the saved one; everyone else sees "Reset". The toolbar filter behaves the same way.
 */
export function ViewerSortButton({
  view,
  fields,
  choice,
  onChoice,
  canSave,
  onSave,
  icon,
}: {
  view: SpaceDbView;
  fields: Array<{ key: string; label: string }>;
  choice: SortChoice;
  onChoice: (next: SortChoice) => void;
  canSave: boolean;
  onSave: (sorts: ViewSort[]) => void;
  icon: ReactNode;
}) {
  const saved = view.sorts?.[0] ?? null;
  const sort = choice === undefined ? saved : choice;
  const differs = choice !== undefined && JSON.stringify(choice) !== JSON.stringify(saved);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="quiet" icon={icon} aria-label="Sort" title="Sort" data-on={sort ? "true" : undefined} />
      </PopoverTrigger>
      <PopoverContent surface="solid" align="end" width="md" padding="xs">
        {sort ? (
          <div className="flex items-center gap-1 p-1 type-body">
            <span className="flex-1 truncate">{fields.find((f) => f.key === sort.field)?.label ?? sort.field}</span>
            <Button variant="outline" onClick={() => onChoice({ field: sort.field, direction: sort.direction === "asc" ? "desc" : "asc" })}>
              {sort.direction === "asc" ? "Ascending" : "Descending"}
            </Button>
            <Button variant="quiet" icon={<X size={14} />} aria-label="Remove sort" onClick={() => onChoice(null)} />
          </div>
        ) : (
          <FieldList fields={fields} onPick={(key) => onChoice({ field: key, direction: "asc" })} />
        )}
        {differs ? (
          <ViewerSaveBar
            canSave={canSave}
            onReset={() => onChoice(undefined)}
            onSave={() => {
              onSave(choice ? [choice] : []);
              onChoice(undefined);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/**
 * An open menu, popover or dialog owns Esc first (Radix closes it); the peek waits for the next Esc. Only layers
 * a person can see count: Radix and the editor leave closed or hidden wrappers mounted, and one of those used to
 * hold Esc away from the peek for good.
 */
export function layerOpen(): boolean {
  const layers = document.querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"], [role="listbox"]');
  for (const el of Array.from(layers)) {
    if (el.closest('[hidden], [aria-hidden="true"], [data-state="closed"], [inert]')) continue;
    if (el.getAttribute("role") === "dialog" && el.getAttribute("data-state") !== "open") continue;
    if (el.style.display === "none" || el.style.visibility === "hidden") continue;
    const check = (el as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility;
    if (typeof check === "function" && !check.call(el)) continue;
    return true;
  }
  return false;
}

/** The open peeks, newest last: Esc closes the newest one only, never two layers in one press. */
const openPeeks: symbol[] = [];

/**
 * Notion's side peek: a panel on the right with a close button; Esc closes it. The database host stops
 * key events from reaching the page natively, so Esc is heard on the window in the capture phase.
 */
export function SidePeek({ onClose, focusFirstField = false, children }: { onClose: () => void; focusFirstField?: boolean; children: ReactNode }) {
  const close = useRef(onClose);
  const aside = useRef<HTMLElement>(null);
  // Round 38 (D5): focus moves INTO the peek when it opens. It stayed on the "New" button, so a person who
  // typed a title pressed New with every space and with Enter (one row became five). A row the person just
  // made puts the cursor in its first field (its title), as Notion does; any other opening focuses the panel.
  useEffect(() => {
    const panel = aside.current;
    if (!panel) return;
    panel.focus({ preventScroll: true });
    if (!focusFirstField) return;
    const started = performance.now();
    let frame = 0;
    let opened = false;
    const FIELD = '.spaces-peek-body input:not([type="hidden"]):not([disabled]), .spaces-peek-body textarea:not([disabled]), .spaces-peek-body [contenteditable="true"]';
    const seek = () => {
      // Only while the person has not moved on themselves.
      const idle = document.activeElement === panel || document.activeElement === document.body || document.activeElement === null;
      if (!idle) return;
      const field = panel.querySelector<HTMLElement>(FIELD);
      if (field) {
        field.focus({ preventScroll: true });
        return;
      }
      // The record page draws a field as text with an "Edit <name>" press (the title is its first one): press
      // it once, and the field it opens takes the caret on the next frame.
      if (!opened) {
        const edit = panel.querySelector<HTMLElement>('.spaces-peek-body dl [role="button"][aria-label^="Edit "]');
        if (edit) {
          opened = true;
          edit.click();
        }
      }
      if (performance.now() - started < 3000) frame = requestAnimationFrame(seek);
    };
    frame = requestAnimationFrame(seek);
    return () => cancelAnimationFrame(frame);
  }, [focusFirstField]);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const me = Symbol("side-peek");
    openPeeks.push(me);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || openPeeks[openPeeks.length - 1] !== me || layerOpen()) return;
      e.preventDefault();
      e.stopPropagation();
      close.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      const at = openPeeks.indexOf(me);
      if (at >= 0) openPeeks.splice(at, 1);
    };
  }, []);
  return (
    <aside ref={aside} tabIndex={-1} className="spaces-peek-side" aria-label="Side peek">
      <div className="spaces-peek-bar">
        <Button variant="quiet" icon={<X size={16} />} aria-label="Close" onClick={onClose} />
      </div>
      <div className="spaces-peek-body">{children}</div>
    </aside>
  );
}

/** Notion's blue "New" in a database toolbar: a new row in place, and the template chevron. */
export function NewButton({
  onNew,
  loadTemplates,
  onSetDefault,
  templatesOff,
}: {
  /** No pick = plain "New" (the table's default template when it has one). */
  onNew: (pick?: NewRowPick) => void;
  /** The table's row templates, read when the chevron opens (left out = this source has none). */
  loadTemplates?: () => Promise<RowTemplateChoice[]>;
  /** "Set as default" on a template row (left out = this person may not change the table). */
  onSetDefault?: (templateId: string) => Promise<void>;
  /** Why the chevron is closed here (the in-memory preview): drawn disabled with this tooltip. */
  templatesOff?: string;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<{ state: "idle" | "loading" } | { state: "ready"; templates: RowTemplateChoice[] } | { state: "failed"; message: string }>({ state: "idle" });
  const load = () => {
    if (!loadTemplates) return;
    setList({ state: "loading" });
    loadTemplates().then(
      (templates) => setList({ state: "ready", templates }),
      (err: unknown) => setList({ state: "failed", message: err instanceof Error ? err.message : String(err) }),
    );
  };
  const pick = (p: NewRowPick) => {
    setOpen(false);
    onNew(p);
  };
  return (
    <div className="spaces-db-new">
      <Button variant="quiet" onClick={() => onNew()}>
        New
      </Button>
      {templatesOff ? (
        <Button variant="quiet" icon={<ChevronDown size={14} />} aria-label="Templates" title={templatesOff} disabled />
      ) : (
        <Popover
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (o) load();
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="quiet" icon={<ChevronDown size={14} />} aria-label="Templates" />
          </PopoverTrigger>
          <PopoverContent surface="solid" align="end" width="sm" padding="xs">
            <div className="px-2 py-1 type-secondary text-muted-foreground">Templates</div>
            {list.state === "loading" ? <div className="spaces-db-loading" aria-label="Loading templates" /> : null}
            {list.state === "failed" ? <ErrorNotice size="inline" message={list.message} /> : null}
            {list.state === "ready"
              ? list.templates.map((t) => (
                  <MenuRow
                    key={t.id}
                    icon={<FileText size={15} />}
                    label={t.name}
                    onClick={() => pick({ kind: "template", id: t.id })}
                    end={
                      t.isDefault ? (
                        <Badge>Default</Badge>
                      ) : onSetDefault ? (
                        <Button
                          variant="quiet"
                          icon={<Star size={14} />}
                          aria-label="Set as default"
                          title="Set as default"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onSetDefault(t.id).then(load, (err: unknown) => setList({ state: "failed", message: err instanceof Error ? err.message : String(err) }));
                          }}
                        />
                      ) : null
                    }
                  />
                ))
              : null}
            <MenuRow icon={<FileText size={15} />} label="Empty page" onClick={() => pick({ kind: "empty" })} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
