"use client";

/** View → Grid view: every slide as a thumbnail; click opens it, drag reorders (Google's slide sorter). */

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId } from "react";
import { EyeOff } from "lucide-react";
import { DragCursorMonitor } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";
import { slideAspect, slideSizeOf } from "@/components/mardown-display/blocks/presentations/slide-size";
import type { Deck, DeckAction } from "../deck-model";
import { isSkipped } from "../deck-slide-ops";
import { PaperSlide } from "../slide-paper";

function Cell({ deck, index, id, selected, canEdit, onOpen }: { deck: Deck; index: number; id: string; selected: boolean; canEdit: boolean; onOpen: (i: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !canEdit });
  const slide = deck.slides[index];
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("min-w-0", isDragging && "z-10 opacity-80")} data-grid-cell={index}>
      <button
        type="button"
        data-clickable
        aria-label={`Slide ${index + 1}${slide?.title ? `: ${slide.title}` : ""}`}
        onClick={() => onOpen(index)}
        className={cn("relative block w-full overflow-hidden rounded-md border-2 bg-white outline-none", selected ? "border-amber-500" : "border-transparent ring-1 ring-border hover:ring-amber-400")}
        style={{ aspectRatio: slideAspect(slideSizeOf(deck)) }}
        {...attributes}
        {...listeners}
      >
        <span className="pointer-events-none absolute inset-0">
          <PaperSlide deck={deck} slide={slide} slideNumber={index + 1} className="h-full w-full" />
        </span>
        {isSkipped(slide) ? <EyeOff className="absolute right-1 top-1 size-4 text-muted-foreground" aria-label="Skipped" /> : null}
      </button>
      <div className="mt-1 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</div>
    </div>
  );
}

export function DeckGridView({ deck, current, canEdit, onOpen, dispatch }: { deck: Deck; current: number; canEdit: boolean; onOpen: (i: number) => void; dispatch: (a: DeckAction) => void }) {
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = deck.slides.map((s, i) => s.id ?? String(i));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    dispatch({ type: "moveSlide", from: ids.indexOf(String(e.active.id)), to: ids.indexOf(String(e.over.id)) });
  };
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4" data-deck-grid="">
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <DragCursorMonitor />
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {deck.slides.map((_, i) => (
              <Cell key={ids[i]} deck={deck} index={i} id={ids[i]!} selected={i === current} canEdit={canEdit} onOpen={onOpen} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
