"use client";

/**
 * The slide rail — Google Slides' filmstrip: numbered thumbnails, click to select, drag to reorder,
 * right-click / ⋮ for the slide's actions, Delete removes the selected slide. A column on desktop,
 * a horizontal strip on a phone.
 */

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { DragCursorMonitor } from "@ai-matrx/design-system";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu/context-menu";
import { cn } from "@/lib/utils";
import type { Deck, DeckAction } from "../deck-model";
import { slideAspect, slideSizeOf } from "@/components/mardown-display/blocks/presentations/slide-size";
import { PaperSlide } from "../slide-paper";

function RailItem({
  deck,
  index,
  id,
  selected,
  canEdit,
  horizontal,
  onSelect,
  dispatch,
}: {
  deck: Deck;
  index: number;
  id: string;
  selected: boolean;
  canEdit: boolean;
  horizontal: boolean;
  onSelect: (i: number) => void;
  dispatch: (a: DeckAction) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !canEdit });
  const slide = deck.slides[index];
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={{ transform: CSS.Transform.toString(transform), transition }}
          className={cn("flex shrink-0 items-start gap-1.5", horizontal ? "w-28" : "w-full", isDragging && "z-10 opacity-80")}
          data-slide-rail-item={index}
        >
          {!horizontal && <span className="w-4 shrink-0 pt-1 text-right text-[11px] tabular-nums text-muted-foreground">{index + 1}</span>}
          <button
            type="button"
            data-clickable
            aria-label={`Slide ${index + 1}${slide?.title ? `: ${slide.title}` : ""}`}
            aria-current={selected ? "true" : undefined}
            onClick={() => onSelect(index)}
            onKeyDown={(e) => {
              if ((e.key === "Delete" || e.key === "Backspace") && canEdit) {
                e.preventDefault();
                dispatch({ type: "deleteSlide", index });
              }
            }}
            className={cn(
              "relative min-w-0 flex-1 overflow-hidden rounded-md border-2 bg-white outline-none",
              selected ? "border-amber-500" : "border-transparent ring-1 ring-border hover:ring-amber-400",
            )}
            {...attributes}
            {...listeners}
            style={{ aspectRatio: slideAspect(slideSizeOf(deck)) }}
          >
            <span className="pointer-events-none absolute inset-0">
              <PaperSlide deck={deck} slide={slide} className="h-full w-full" />
            </span>
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={!canEdit} onSelect={() => dispatch({ type: "addSlide", after: index })}>
          <Plus className="mr-2 size-4" /> New slide
        </ContextMenuItem>
        <ContextMenuItem disabled={!canEdit} onSelect={() => dispatch({ type: "duplicateSlide", index })}>
          <Copy className="mr-2 size-4" /> Duplicate slide
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!canEdit} onSelect={() => dispatch({ type: "deleteSlide", index })}>
          <Trash2 className="mr-2 size-4" /> Delete slide
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function SlideRail({
  deck,
  current,
  canEdit,
  horizontal,
  onSelect,
  dispatch,
}: {
  deck: Deck;
  current: number;
  canEdit: boolean;
  horizontal: boolean;
  onSelect: (i: number) => void;
  dispatch: (a: DeckAction) => void;
}) {
  // dnd-kit numbers its screen-reader descriptions from a module counter, which differs between the
  // server render and the browser (a hydration error). A stable id per context fixes it.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = deck.slides.map((s, i) => s.id ?? `slide-${i}`);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from >= 0 && to >= 0) dispatch({ type: "moveSlide", from, to });
  };
  return (
    <nav
      aria-label="Slides"
      data-slide-rail=""
      className={cn(
        "shrink-0 overflow-auto bg-muted/30 [scrollbar-width:thin]",
        horizontal ? "flex h-[5.5rem] items-center gap-2 border-t border-border px-2" : "flex w-48 flex-col gap-3 border-r border-border px-2 py-3",
      )}
    >
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <DragCursorMonitor />
        <SortableContext items={ids} strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}>
          {deck.slides.map((s, i) => (
            <RailItem
              key={ids[i]}
              id={ids[i]!}
              deck={deck}
              index={i}
              selected={i === current}
              canEdit={canEdit}
              horizontal={horizontal}
              onSelect={onSelect}
              dispatch={dispatch}
            />
          ))}
        </SortableContext>
      </DndContext>
    </nav>
  );
}
