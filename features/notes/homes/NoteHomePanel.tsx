"use client";

// features/notes/homes/NoteHomePanel.tsx
//
// THE ONE place a note's scopes are set (Arman, 2026-10-10: "two different
// ways of associating a note with a scope… doesn't make sense"):
//   • Home — exactly one. Choosing one MOVES the note (moveNoteToHome); its
//     organization follows.
//   • Also relates to — other scopes / projects / tasks as associations
//     (ContextAssignmentField tagging; any organization; never moves the note).
// Opened by the bottom-bar home button, the tab-strip shield and the mobile
// dock — the same panel everywhere.

import React, { useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { selectNoteById } from "../redux/selectors";
import { NoteContextSection } from "../components/NoteContextSection";
import { HomePickerList } from "./HomePicker";
import { moveNoteToHome } from "./moveNoteToHome";
import type { NoteHome } from "./homeModel";

export function NoteHomePanel({
  noteId,
  className,
  onMoved,
}: {
  noteId: string;
  className?: string;
  /** Called after a successful move (a popover host closes itself). */
  onMoved?: () => void;
}) {
  const dispatch = useAppDispatch();
  const note = useAppSelector(useMemo(() => selectNoteById(noteId), [noteId]));
  const [busy, setBusy] = useState(false);
  if (!note) return null;

  const pick = async (home: NoteHome, label: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await dispatch(moveNoteToHome({ noteId, scopeId: home.scopeId, homeLabel: label })).unwrap();
      if (result.ok) onMoved?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)} data-note-home-panel>
      <section className="flex min-h-0 flex-col rounded-md border border-border">
        <h3 className="px-2 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Home
        </h3>
        <HomePickerList
          currentScopeId={note.home_scope_id ?? null}
          defaultOrganizationId={note.organization_id}
          onPick={pick}
          busy={busy}
          listClassName="max-h-[200px]"
        />
      </section>
      <section className="flex min-h-0 flex-col">
        <h3 className="px-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Also relates to
        </h3>
        <NoteContextSection noteId={noteId} embedded />
      </section>
    </div>
  );
}
