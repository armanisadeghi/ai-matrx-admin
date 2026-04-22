"use client";

/**
 * OptionsEditor — Gmail-recipients-style options input.
 *
 *   • Always renders one extra empty input at the bottom. Typing into it
 *     commits the row and appends a fresh empty trailing input.
 *   • Committed rows are draggable to reorder (dnd-kit/sortable). The trailing
 *     empty row is excluded from the sortable context.
 *   • Edits emit immediately; duplicates and empties are pruned on blur.
 *   • Self-contained state — parent owns `options: string[]`.
 */

import React, { useEffect, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface OptionsEditorProps {
  options: string[];
  onChange: (next: string[]) => void;
  readonly?: boolean;
  /** Text shown under the label when options aren't used by the current type. */
  unusedNote?: string;
}

type Row = { id: string; value: string };

let rowIdCounter = 0;
const genRowId = () => `opt-${++rowIdCounter}`;

/** Strip empty entries and dedupe, preserving first occurrence. */
function toRealOptions(rows: Row[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const v = r.value.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function arrayEq(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function OptionsEditor({
  options,
  onChange,
  readonly,
  unusedNote,
}: OptionsEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => [
    ...options.map((v) => ({ id: genRowId(), value: v })),
    { id: genRowId(), value: "" },
  ]);

  // Track which row IDs duplicate an earlier row (during in-flight typing).
  const duplicateIds = new Set<string>();
  {
    const firstSeen = new Map<string, string>();
    for (const r of rows) {
      const v = r.value.trim();
      if (!v) continue;
      if (firstSeen.has(v)) duplicateIds.add(r.id);
      else firstSeen.set(v, r.id);
    }
  }

  // Sync when parent's `options` changes externally (undo/redo, Redux replace).
  const lastEmittedRef = useRef<string[]>(options);
  useEffect(() => {
    if (arrayEq(options, lastEmittedRef.current)) return;
    const current = toRealOptions(rows);
    if (arrayEq(current, options)) {
      lastEmittedRef.current = options;
      return;
    }
    const next: Row[] = [];
    const used = new Set<string>();
    for (const v of options) {
      const match = rows.find((r) => !used.has(r.id) && r.value === v);
      if (match) {
        next.push(match);
        used.add(match.id);
      } else {
        next.push({ id: genRowId(), value: v });
      }
    }
    next.push({ id: genRowId(), value: "" });
    setRows(next);
    lastEmittedRef.current = options;
  }, [options, rows]);

  const emit = (next: Row[]) => {
    const real = toRealOptions(next);
    if (!arrayEq(real, lastEmittedRef.current)) {
      lastEmittedRef.current = real;
      onChange(real);
    }
  };

  const updateRow = (id: string, value: string) => {
    setRows((prev) => {
      let next = prev.map((r) => (r.id === id ? { ...r, value } : r));
      const last = next[next.length - 1];
      if (last && last.value.trim().length > 0) {
        next = [...next, { id: genRowId(), value: "" }];
      }
      emit(next);
      return next;
    });
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      // Ensure a trailing empty always exists.
      if (next.length === 0 || next[next.length - 1].value.trim().length > 0) {
        next.push({ id: genRowId(), value: "" });
      }
      emit(next);
      return next;
    });
  };

  const blurRow = (id: string) => {
    setRows((prev) => {
      // Prune empty rows except the trailing one.
      const trimmed = prev.filter(
        (r, i) => i === prev.length - 1 || r.value.trim().length > 0,
      );
      // Dedupe (keep first), but don't touch the trailing.
      const seen = new Set<string>();
      const body = trimmed.slice(0, -1).filter((r) => {
        const v = r.value.trim();
        if (seen.has(v)) return false;
        seen.add(v);
        return true;
      });
      const next = [...body, trimmed[trimmed.length - 1]];
      emit(next);
      return next;
    });
    void id;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const committed = rows.slice(0, -1);
  const trailing = rows[rows.length - 1];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = committed.findIndex((r) => r.id === active.id);
    const newIdx = committed.findIndex((r) => r.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(committed, oldIdx, newIdx);
    const next = [...reordered, trailing];
    setRows(next);
    emit(next);
  };

  return (
    <div className="space-y-1.5">
      {unusedNote && (
        <p className="text-[11px] text-muted-foreground italic leading-tight">
          {unusedNote}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={committed.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {committed.map((row) => (
              <SortableOptionRow
                key={row.id}
                id={row.id}
                value={row.value}
                isDuplicate={duplicateIds.has(row.id)}
                readonly={readonly}
                onChange={(v) => updateRow(row.id, v)}
                onBlur={() => blurRow(row.id)}
                onRemove={() => removeRow(row.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!readonly && trailing && (
        <div className="flex items-center gap-1.5 pl-6">
          <Input
            value={trailing.value}
            onChange={(e) => updateRow(trailing.id, e.target.value)}
            onBlur={() => blurRow(trailing.id)}
            placeholder={
              committed.length === 0 ? "Type an option…" : "Add another option…"
            }
            className="h-7 text-xs"
            style={{ fontSize: "16px" }}
          />
          {/* Placeholder to align widths with committed rows (grip + X) */}
          <span className="w-5 shrink-0" aria-hidden />
        </div>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface SortableOptionRowProps {
  id: string;
  value: string;
  isDuplicate: boolean;
  readonly?: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  onRemove: () => void;
}

function SortableOptionRow({
  id,
  value,
  isDuplicate,
  readonly,
  onChange,
  onBlur,
  onRemove,
}: SortableOptionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 group"
    >
      {!readonly ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-5 h-7 shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}
          aria-label="Reorder option"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="w-5 shrink-0" aria-hidden />
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={readonly}
        className={cn("h-7 text-xs", isDuplicate && "border-destructive")}
        style={{ fontSize: "16px" }}
      />
      {!readonly ? (
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center w-5 h-7 shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors"
          aria-label="Remove option"
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="w-5 shrink-0" aria-hidden />
      )}
    </div>
  );
}
