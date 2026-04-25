"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  BarChart3,
  MessageSquare,
  Briefcase,
  Lightbulb,
  Target,
  Users,
  FileText,
  Zap,
  Plus,
  X,
  GripVertical,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DragItem {
  id: string;
  label: string;
  iconName: string;
  color: string;
}

interface DragState {
  itemId: string;
  originContainer: string | null;
  pointerOffset: { x: number; y: number };
  startRect: DOMRect;
  currentPos: { x: number; y: number };
}

type Assignments = Record<string, string | null>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Calendar,
  BarChart3,
  MessageSquare,
  Briefcase,
  Lightbulb,
  Target,
  Users,
  FileText,
  Zap,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const COLOR_OPTIONS = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "cyan",
  "orange",
  "pink",
];

const COLOR_CLASSES: Record<
  string,
  { bg: string; border: string; text: string; ring: string }
> = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-400",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-400",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-400",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-900/40",
    border: "border-rose-300 dark:border-rose-700",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-400",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-400",
  },
  cyan: {
    bg: "bg-cyan-100 dark:bg-cyan-900/40",
    border: "border-cyan-300 dark:border-cyan-700",
    text: "text-cyan-700 dark:text-cyan-300",
    ring: "ring-cyan-400",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-400",
  },
  pink: {
    bg: "bg-pink-100 dark:bg-pink-900/40",
    border: "border-pink-300 dark:border-pink-700",
    text: "text-pink-700 dark:text-pink-300",
    ring: "ring-pink-400",
  },
};

const INITIAL_ITEMS: DragItem[] = [
  {
    id: "item-planning",
    label: "Planning",
    iconName: "Calendar",
    color: "blue",
  },
  {
    id: "item-research",
    label: "Research",
    iconName: "BarChart3",
    color: "emerald",
  },
  {
    id: "item-communication",
    label: "Communication",
    iconName: "MessageSquare",
    color: "amber",
  },
  { id: "item-strategy", label: "Strategy", iconName: "Target", color: "rose" },
  {
    id: "item-innovation",
    label: "Innovation",
    iconName: "Lightbulb",
    color: "violet",
  },
];

const CONTAINERS = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

function getColorClasses(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.blue;
}

// ---------------------------------------------------------------------------
// Drag Overlay (portaled to body, always on top)
// ---------------------------------------------------------------------------

function DragOverlay({
  item,
  pos,
  isInContainer,
}: {
  item: DragItem;
  pos: { x: number; y: number };
  isInContainer: boolean;
}) {
  const Icon = ICON_MAP[item.iconName] ?? Calendar;
  const c = getColorClasses(item.color);

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 99999,
        pointerEvents: "none",
        transition: "transform 80ms ease-out, opacity 80ms ease-out",
      }}
    >
      {isInContainer ? (
        <div
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 shadow-xl ${c.bg} ${c.border} opacity-90`}
        >
          <Icon className={`h-4 w-4 ${c.text}`} />
          <span className={`text-xs font-semibold ${c.text}`}>
            {item.label}
          </span>
        </div>
      ) : (
        <div
          className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 shadow-2xl bg-card ${c.border} opacity-95 min-w-[180px]`}
        >
          <div className={`rounded-full p-2 ${c.bg}`}>
            <Icon className={`h-5 w-5 ${c.text}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {item.label}
            </div>
            <div className="text-xs text-muted-foreground">Drag to assign</div>
          </div>
          <GripVertical className="ml-auto h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Source Chip (in the tray — larger card-style)
// ---------------------------------------------------------------------------

function SourceChip({
  item,
  isDragging,
  onPointerDown,
}: {
  item: DragItem;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent, item: DragItem, origin: null) => void;
}) {
  const Icon = ICON_MAP[item.iconName] ?? Calendar;
  const c = getColorClasses(item.color);

  return (
    <motion.div
      layout
      layoutId={item.id}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: isDragging ? 0.95 : 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onPointerDown={(e) => onPointerDown(e, item, null)}
      className={`flex cursor-grab select-none items-center gap-3 rounded-lg border-2 bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${c.border} ${isDragging ? "pointer-events-none" : ""}`}
      style={{ touchAction: "none" }}
    >
      <div className={`rounded-full p-2 ${c.bg}`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {item.label}
        </div>
        <div className="text-xs text-muted-foreground">Drag to assign</div>
      </div>
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Container Chip (compact square inside drop zone)
// ---------------------------------------------------------------------------

function ContainerChip({
  item,
  isDragging,
  containerId,
  onPointerDown,
  onRemove,
}: {
  item: DragItem;
  isDragging: boolean;
  containerId: string;
  onPointerDown: (
    e: React.PointerEvent,
    item: DragItem,
    origin: string,
  ) => void;
  onRemove: (itemId: string) => void;
}) {
  const Icon = ICON_MAP[item.iconName] ?? Calendar;
  const c = getColorClasses(item.color);

  return (
    <motion.div
      layout
      layoutId={item.id}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: isDragging ? 0.9 : 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onPointerDown={(e) => onPointerDown(e, item, containerId)}
      className={`group relative flex cursor-grab select-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${c.bg} ${c.border} ${isDragging ? "pointer-events-none" : ""}`}
      style={{ touchAction: "none" }}
    >
      <Icon className={`h-4 w-4 shrink-0 ${c.text}`} />
      <span className={`text-xs font-semibold whitespace-nowrap ${c.text}`}>
        {item.label}
      </span>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 group-hover:opacity-100"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Drop Zone
// ---------------------------------------------------------------------------

function DropZone({
  container,
  items,
  dragItemId,
  isOver,
  onRefMount,
  onPointerDown,
  onRemove,
}: {
  container: { id: string; label: string };
  items: DragItem[];
  dragItemId: string | null;
  isOver: boolean;
  onRefMount: (el: HTMLDivElement | null) => void;
  onPointerDown: (
    e: React.PointerEvent,
    item: DragItem,
    origin: string,
  ) => void;
  onRemove: (itemId: string) => void;
}) {
  return (
    <div
      ref={onRefMount}
      className={`relative flex min-h-[160px] flex-col rounded-lg border-2 border-dashed bg-muted/30 p-3 transition-all duration-200 ${
        isOver
          ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
          : "border-border"
      }`}
    >
      <div className="mb-2 text-sm font-semibold text-foreground">
        {container.label}
      </div>

      {items.length === 0 && !isOver && (
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground/60">
          Drop items here
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <ContainerChip
              key={item.id}
              item={item}
              isDragging={dragItemId === item.id}
              containerId={container.id}
              onPointerDown={onPointerDown}
              onRemove={onRemove}
            />
          ))}
        </AnimatePresence>
      </div>

      {isOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary/30"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Item Form
// ---------------------------------------------------------------------------

function AddItemForm({ onAdd }: { onAdd: (item: DragItem) => void }) {
  const [label, setLabel] = useState("");
  const [iconName, setIconName] = useState("Briefcase");
  const [color, setColor] = useState("blue");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: trimmed,
      iconName,
      color,
    });
    setLabel("");
    inputRef.current?.focus();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Add Item
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex-1 min-w-[140px]">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Label
        </label>
        <input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Item name..."
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ fontSize: "16px" }}
          autoFocus
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Icon
        </label>
        <div className="flex gap-1">
          {ICON_OPTIONS.map((name) => {
            const Ico = ICON_MAP[name];
            return (
              <button
                key={name}
                onClick={() => setIconName(name)}
                className={`rounded-md p-1.5 transition-colors ${
                  iconName === name
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Ico className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Color
        </label>
        <div className="flex gap-1">
          {COLOR_OPTIONS.map((c) => {
            const classes = getColorClasses(c);
            return (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${classes.bg} ${
                  color === c
                    ? `scale-110 ${classes.border} ring-2 ${classes.ring}`
                    : "border-transparent"
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={handleSubmit}
          disabled={!label.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Add
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Assignment Summary
// ---------------------------------------------------------------------------

function AssignmentSummary({
  items,
  assignments,
}: {
  items: DragItem[];
  assignments: Assignments;
}) {
  const grouped: Record<string, DragItem[]> = { unassigned: [] };
  CONTAINERS.forEach((c) => (grouped[c.id] = []));

  items.forEach((item) => {
    const dest = assignments[item.id] ?? "unassigned";
    grouped[dest] = [...(grouped[dest] ?? []), item];
  });

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Assignment Tracker
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {[{ id: "unassigned", label: "Unassigned" }, ...CONTAINERS].map((c) => (
          <div
            key={c.id}
            className="rounded-md border border-border bg-card p-2.5"
          >
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              {c.label}
            </div>
            {grouped[c.id].length === 0 ? (
              <div className="text-xs text-muted-foreground/40">None</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {grouped[c.id].map((item) => {
                  const cc = getColorClasses(item.color);
                  const Icon = ICON_MAP[item.iconName] ?? Calendar;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${cc.bg}`}
                    >
                      <Icon className={`h-3 w-3 ${cc.text}`} />
                      <span className={`text-xs ${cc.text}`}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ContainerDropDemo() {
  const [items, setItems] = useState<DragItem[]>(INITIAL_ITEMS);
  const [assignments, setAssignments] = useState<Assignments>(() => {
    const init: Assignments = {};
    INITIAL_ITEMS.forEach((item) => (init[item.id] = null));
    return init;
  });

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverContainerId, setHoverContainerId] = useState<string | null>(null);

  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sourceTrayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    itemId: string;
    offset: { x: number; y: number };
  } | null>(null);

  const refCallbacks = useRef<
    Record<string, (el: HTMLDivElement | null) => void>
  >({});
  const getRefCallback = useCallback((id: string) => {
    if (!refCallbacks.current[id]) {
      refCallbacks.current[id] = (el: HTMLDivElement | null) => {
        containerRefs.current[id] = el;
      };
    }
    return refCallbacks.current[id];
  }, []);

  // -----------------------------------------------------------------------
  // Hit-test: which container is the pointer over?
  // -----------------------------------------------------------------------
  const hitTest = useCallback(
    (clientX: number, clientY: number): string | null => {
      for (const container of CONTAINERS) {
        const el = containerRefs.current[container.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return container.id;
        }
      }
      return null;
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Pointer handlers
  // -----------------------------------------------------------------------
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, item: DragItem, originContainer: string | null) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      dragRef.current = { itemId: item.id, offset };

      setDragState({
        itemId: item.id,
        originContainer: originContainer,
        pointerOffset: offset,
        startRect: rect,
        currentPos: { x: rect.left, y: rect.top },
      });
    },
    [],
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: PointerEvent) => {
      const ref = dragRef.current;
      if (!ref) return;
      const x = e.clientX - ref.offset.x;
      const y = e.clientY - ref.offset.y;

      setDragState((prev) => (prev ? { ...prev, currentPos: { x, y } } : null));
      setHoverContainerId(hitTest(e.clientX, e.clientY));
    };

    const handleUp = (e: PointerEvent) => {
      const ref = dragRef.current;
      if (!ref) return;
      const targetContainer = hitTest(e.clientX, e.clientY);

      setAssignments((prev) => ({
        ...prev,
        [ref.itemId]: targetContainer,
      }));

      dragRef.current = null;
      setDragState(null);
      setHoverContainerId(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [!!dragState, hitTest]); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------------
  // Add / Remove
  // -----------------------------------------------------------------------
  const handleAddItem = useCallback((item: DragItem) => {
    setItems((prev) => [...prev, item]);
    setAssignments((prev) => ({ ...prev, [item.id]: null }));
  }, []);

  const handleRemoveFromContainer = useCallback((itemId: string) => {
    setAssignments((prev) => ({ ...prev, [itemId]: null }));
  }, []);

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------
  const unassignedItems = items.filter(
    (item) =>
      assignments[item.id] === null || assignments[item.id] === undefined,
  );
  const getContainerItems = (containerId: string) =>
    items.filter((item) => assignments[item.id] === containerId);

  const draggingItem = dragState
    ? (items.find((i) => i.id === dragState.itemId) ?? null)
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <h1 className="mb-1 text-2xl font-bold text-foreground">
        Container Drop Demo
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Drag items from the source tray into containers. Items transform into
        compact chips on drop. Remove them with the X button or drag them out to
        unassign.
      </p>

      {/* Source Tray */}
      <div
        ref={sourceTrayRef}
        className="mb-6 rounded-lg border border-border bg-card p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Available Items
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({unassignedItems.length})
            </span>
          </h2>
        </div>

        <div className="mb-3">
          <AddItemForm onAdd={handleAddItem} />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {unassignedItems.map((item) => (
              <SourceChip
                key={item.id}
                item={item}
                isDragging={dragState?.itemId === item.id}
                onPointerDown={handlePointerDown}
              />
            ))}
          </AnimatePresence>
        </div>

        {unassignedItems.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground/50">
            All items have been assigned. Add more above or remove from
            containers below.
          </div>
        )}
      </div>

      {/* Drop Zones */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CONTAINERS.map((container) => (
          <DropZone
            key={container.id}
            container={container}
            items={getContainerItems(container.id)}
            dragItemId={dragState?.itemId ?? null}
            isOver={hoverContainerId === container.id}
            onRefMount={getRefCallback(container.id)}
            onPointerDown={handlePointerDown}
            onRemove={handleRemoveFromContainer}
          />
        ))}
      </div>

      {/* Assignment Summary */}
      <AssignmentSummary items={items} assignments={assignments} />

      {/* Drag Overlay (portaled to body) */}
      {dragState && draggingItem && (
        <DragOverlay
          item={draggingItem}
          pos={dragState.currentPos}
          isInContainer={dragState.originContainer !== null}
        />
      )}
    </div>
  );
}
