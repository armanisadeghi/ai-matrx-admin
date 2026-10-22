"use client";

// HeaderPane — the Header's buttons, left to right: the five header controls (Search and Notifications are
// reserved — always there, shown with a lock), plus your own: a page, a link, a launchpad or an AI job.
// Reorder by dragging a row's handle (the same dnd-kit drag as the Sidebar's ArrangeTree), or with the
// row's left/right buttons — the keyboard and touch twin of the drag.
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { ArrowDown, ArrowUp, Bell, BrainCircuit, GripVertical, Lock, MessageSquare, PanelRight, Plus, Search, Trash2, type LucideIcon } from "lucide-react";
import { DragCursorMonitor, Popover, PopoverContent, PopoverTrigger, cn } from "@ai-matrx/design-system";
import { Button, SearchField } from "@ai-matrx/design-system/controls";
import ShellIcon from "@/features/shell/components/ShellIcon";
import type { ShellIconName } from "@/features/shell/shellIconMap";
import { RESERVED_HEADER_CONTROLS, type HeaderButton, type HeaderControlId } from "../contract";
import { getCatalogEntry, type ShellCatalogEntry } from "../catalog";
import { AddOwnRow, type PickOption } from "./AddOwnRow";
import { IconPicker } from "./IconPicker";
import { addHeaderButton, isLockedHeaderButton, listDropIndex, moveInList } from "./tree";

type HeaderDrop = { id: string; side: "before" | "after" };

const CONTROL: Record<HeaderControlId, { label: string; Icon: LucideIcon }> = {
  search: { label: "Search", Icon: Search },
  intelligence: { label: "Intelligence", Icon: BrainCircuit },
  messages: { label: "Messages", Icon: MessageSquare },
  notifications: { label: "Notifications", Icon: Bell },
  canvas: { label: "Canvas", Icon: PanelRight },
};

function buttonLabel(b: HeaderButton): string {
  if (b.kind === "control") return CONTROL[b.control].label;
  if (b.kind === "nav") return b.label ?? getCatalogEntry(b.ref, { isAdmin: true })?.label ?? b.ref;
  return b.label;
}

function buttonIcon(b: Exclude<HeaderButton, { kind: "control" }>): ShellIconName {
  if (b.kind === "nav") return b.icon ?? getCatalogEntry(b.ref, { isAdmin: true })?.iconName ?? "Link2";
  if (b.kind === "launchpad") return b.icon ?? "LayoutGrid";
  return b.icon;
}

const KIND_WORD: Partial<Record<HeaderButton["kind"], string>> = { nav: "Page", link: "Link", launchpad: "Launchpad", mandate: "AI job" };

/** The word beside a row: a `link` into the app (a page or a record added from it) is a Page, not a Link. */
export function headerKindWord(b: HeaderButton): string | undefined {
  if (b.kind === "link" && b.href.startsWith("/") && !b.href.startsWith("//")) return "Page";
  return KIND_WORD[b.kind];
}

export function HeaderPane({
  buttons,
  catalog,
  launchpads,
  jobs,
  jobsLoading,
  onChange,
}: {
  buttons: HeaderButton[];
  catalog: ShellCatalogEntry[];
  launchpads: PickOption[];
  jobs: PickOption[];
  jobsLoading: boolean;
  onChange: (next: HeaderButton[]) => void;
}) {
  const missing = (Object.keys(CONTROL) as HeaderControlId[]).filter((c) => !buttons.some((b) => b.kind === "control" && b.control === c));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 p-2">
        <PagePicker catalog={catalog} onPick={(ref) => onChange(addHeaderButton(buttons, { kind: "nav", ref }))} />
        <AddOwnRow
          kinds={["link", "launchpad", "mandate"]}
          launchpads={launchpads}
          jobs={jobs}
          jobsLoading={jobsLoading}
          onAdd={(row) => {
            if (row.kind === "link") onChange(addHeaderButton(buttons, { kind: "link", label: row.label, href: row.href, icon: row.icon, newTab: row.newTab }));
            if (row.kind === "launchpad") onChange(addHeaderButton(buttons, { kind: "launchpad", key: row.key, label: row.label, icon: row.icon }));
            if (row.kind === "mandate") onChange(addHeaderButton(buttons, { kind: "mandate", label: row.label, mandateKey: row.mandateKey, icon: row.icon }));
          }}
        />
        {missing.map((control) => (
          <Button
            key={control}
            variant="quiet"
            icon={(() => {
              const Icon = CONTROL[control].Icon;
              return <Icon />;
            })()}
            onClick={() => onChange([...buttons, { kind: "control", id: `control.${control}`, control }])}
          >
            {CONTROL[control].label}
          </Button>
        ))}
      </div>
      <HeaderList buttons={buttons} onChange={onChange} />
    </div>
  );
}

function HeaderList({ buttons, onChange }: { buttons: HeaderButton[]; onChange: (next: HeaderButton[]) => void }) {
  const [drop, setDrop] = useState<HeaderDrop | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));

  const zoneFor = (event: DragMoveEvent): HeaderDrop | null => {
    const over = event.over;
    if (!over || over.id === event.active.id) return null;
    const start = event.activatorEvent as PointerEvent | TouchEvent;
    const startY = "touches" in start ? (start.touches[0]?.clientY ?? 0) : start.clientY;
    const y = startY + event.delta.y;
    return { id: String(over.id), side: y < over.rect.top + over.rect.height / 2 ? "before" : "after" };
  };

  const end = (activeId: string) => {
    const zone = drop;
    setDrop(null);
    setDragging(null);
    if (!zone) return;
    const from = buttons.findIndex((b) => b.id === activeId);
    const over = buttons.findIndex((b) => b.id === zone.id);
    if (from === -1 || over === -1) return;
    onChange(moveInList(buttons, activeId, listDropIndex(from, over, zone.side)));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e) => setDragging(String(e.active.id))}
      onDragMove={(e) => setDrop(zoneFor(e))}
      onDragCancel={() => {
        setDrop(null);
        setDragging(null);
      }}
      onDragEnd={(e) => end(String(e.active.id))}
    >
      <DragCursorMonitor />
      <ol className="min-h-0 flex-1 overflow-y-auto px-1 pb-2" aria-label="Your header, left to right">
        {buttons.map((b, i) => (
          <HeaderRow
            key={b.id}
            button={b}
            index={i}
            buttons={buttons}
            onChange={onChange}
            dragging={dragging === b.id}
            mark={drop && drop.id === b.id ? drop.side : null}
          />
        ))}
      </ol>
    </DndContext>
  );
}

function HeaderRow({
  button: b,
  index: i,
  buttons,
  onChange,
  dragging,
  mark,
}: {
  button: HeaderButton;
  index: number;
  buttons: HeaderButton[];
  onChange: (next: HeaderButton[]) => void;
  dragging: boolean;
  mark: "before" | "after" | null;
}) {
  const drag = useDraggable({ id: b.id });
  const dropZone = useDroppable({ id: b.id });
  const locked = isLockedHeaderButton(b, RESERVED_HEADER_CONTROLS);
  const label = buttonLabel(b);
  return (
    <li
      ref={(el) => {
        dropZone.setNodeRef(el);
        drag.setNodeRef(el);
      }}
      className={cn("relative flex min-h-9 items-center gap-1 rounded-md px-1 hover:bg-accent", dragging && "opacity-50")}
      data-header-row={b.id}
    >
      {mark === "before" ? <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-primary" /> : null}
      {mark === "after" ? <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-primary" /> : null}
      <span
        {...drag.listeners}
        {...drag.attributes}
        aria-label={`Drag ${label}`}
        className="flex h-7 w-5 shrink-0 touch-none items-center justify-center text-muted-foreground"
        data-drag-handle
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </span>
      {b.kind === "control" ? (
        <span className="flex h-7 w-7 items-center justify-center">
          {(() => {
            const Icon = CONTROL[b.control].Icon;
            return <Icon className="h-4 w-4" aria-hidden />;
          })()}
        </span>
      ) : (
        <IconPicker
          value={buttonIcon(b)}
          onChange={(icon) => onChange(buttons.map((x) => (x.id === b.id && x.kind !== "control" ? { ...x, icon } : x)))}
        />
      )}
      <span className="min-w-0 flex-1 truncate type-body">{label}</span>
      {headerKindWord(b) ? <span className="type-meta text-muted-foreground">{headerKindWord(b)}</span> : null}
      {locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Always in the header" /> : null}
      <Button variant="quiet" aria-label={`Move ${label} left`} icon={<ArrowUp />} disabled={i === 0} onClick={() => onChange(moveInList(buttons, b.id, i - 1))} />
      <Button
        variant="quiet"
        aria-label={`Move ${label} right`}
        icon={<ArrowDown />}
        disabled={i === buttons.length - 1}
        onClick={() => onChange(moveInList(buttons, b.id, i + 1))}
      />
      <Button
        variant="quiet"
        removes
        aria-label={locked ? `${label} is always in the header` : `Remove ${label}`}
        title={locked ? "Always in the header" : "Remove"}
        icon={<Trash2 />}
        disabled={locked}
        onClick={() => onChange(buttons.filter((x) => x.id !== b.id))}
      />
    </li>
  );
}

/** Any page from the catalog, found by name. */
export function PagePicker({ catalog, onPick, label = "Page" }: { catalog: ShellCatalogEntry[]; onPick: (entryId: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = catalog.filter((e) => e.href !== null || e.tileId).filter((e) => !q || e.label.toLowerCase().includes(q)).slice(0, 60);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" icon={<Plus />}>
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <SearchField autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a page or tool" aria-label="Find a page or tool" />
        <ul className="mt-1 max-h-72 overflow-y-auto">
          {shown.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                onClick={() => {
                  onPick(entry.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <ShellIcon name={entry.iconName} className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate type-body">{entry.label}</span>
                {entry.parentId ? <span className="type-meta truncate text-muted-foreground">{getCatalogEntry(entry.parentId, { isAdmin: true })?.label}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
