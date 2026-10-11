// features/flashcards/components/study/StudyCardEditDialog.tsx
//
// "Edit card" while studying: the deck editor's OWN CardEditor (the one the
// /education/flashcards/[setId]/edit page renders per card) in a dialog — a
// bottom sheet on a phone. Every keystroke autosaves through fcService inside
// CardEditor; each landed save calls `onSaved`, and the study driver's
// refreshCards re-reads the deck anchored on the current card id, so the
// study view updates in place without losing position. Loaded on first open
// (StudyDeck lazy-imports this module).
//
// React Compiler is on: no manual useMemo / useCallback / React.memo.

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ItemMasteryRow } from "@/features/education/study/types";
import type { CardWithDetails } from "../../data/types";
import { CardEditor } from "../editor/EditSetView";

export function StudyCardEditDialog({
  open,
  onOpenChange,
  card,
  index,
  count,
  mastery,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CardWithDetails;
  index: number;
  count: number;
  mastery: ItemMasteryRow | undefined;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="text-base">Edit card</DialogTitle>
        </DialogHeader>
        <div className="p-3">
          {/* Keyed by id: a different card gets a fresh editor, never the
              last card's unsaved fields. */}
          <CardEditor
            key={card.id}
            card={card}
            index={index}
            count={count}
            mastery={mastery}
            onImagesChanged={onSaved}
            onSaved={onSaved}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
