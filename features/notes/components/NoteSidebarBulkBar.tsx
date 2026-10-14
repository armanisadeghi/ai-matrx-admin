"use client";

/**
 * NoteSidebarBulkBar — the notes sidebar's bulk bar while selection mode is on.
 * It renders the moment selection mode is entered (docked at the TOP, below the
 * toolbar) so nothing shifts when the first note is ticked.
 *
 * Selection is the shared `useRowSelection` over the visible notes (owned by
 * the sidebar) and the bar is the shared `RowSelectionBar`; the ACTIONS come
 * from `buildNoteBulkActions`. This file owns only the home picker for Move to…
 * and wires Clear to leaving selection mode.
 */

import { useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  RowSelectionBar,
  type RowSelection,
} from "@/lib/entity-list/RowSelectionBar";
import type { NoteRecord } from "../redux/notes.types";
import { HomePickerDialog } from "../homes/HomePicker";
import { buildNoteBulkActions } from "./noteBulkActions";

const noteIdOf = (note: NoteRecord) => note.id;

interface NoteSidebarBulkBarProps {
  instanceId: string;
  selection: RowSelection<NoteRecord>;
  openTabIds: string[] | undefined;
  /** Leave selection mode (clears the selection). */
  onExit: () => void;
}

export function NoteSidebarBulkBar({
  instanceId,
  selection,
  openTabIds,
  onExit,
}: NoteSidebarBulkBarProps) {
  const dispatch = useAppDispatch();
  const [moveOpen, setMoveOpen] = useState(false);

  const actions = buildNoteBulkActions({
    dispatch,
    instanceId,
    openTabIds,
    onClear: onExit,
    openMove: () => setMoveOpen(true),
  });

  return (
    <>
      <div className="shrink-0 border-b border-border/30 bg-accent/40 p-1.5">
        <RowSelectionBar
          selection={{ ...selection, clear: onExit }}
          idOf={noteIdOf}
          actions={actions}
          noun="note"
          plural="notes"
          compact
          onRefresh={() => {}}
        />
      </div>
      {/* Move to… — one home picker; a selection spanning organizations
          moves each note through moveNoteToHome (organization follows). */}
      <HomePickerDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        noteIds={selection.rows.map((note) => note.id)}
        onMoved={onExit}
      />
    </>
  );
}
