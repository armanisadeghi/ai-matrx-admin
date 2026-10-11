"use client";

// features/notes/components/NoteContextSection.tssx
//
// The note's context surface — the official replacement for the old glassy
// NoteContextPicker. Two entry points, one behavior:
//
//   • NoteContextSection  — expanded form at the bottom of the note
//     (metadata bar panel).
//   • NoteContextStatusIcon — the tab-strip shortcut: amber shield when the
//     note has NO context (org/scope/project/task all empty), green when any
//     is set; click opens the same picker in a popover.
//
// Writes:
//   • Scopes      → ctx_scope_assignments via the field's canonical live path.
//   • Project/task associations → setNoteField + saveNote (the notes save pipeline),
//     applied from the SAME selection on save — both entry points share
//     `noteSaveAdapter` so behavior can never drift.
//
// Organization: never set here. A note's organization IS its home's
// organization and changes only by moving the note (the home chip →
// `moveNoteToHome`). The field's organization dropdown is a browse filter for
// the scope list and has no save meaning for a note.

import { noteDisplayLabel } from "@/features/notes/format";
import React, { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { NoteHomePanel } from "@/features/notes/homes/NoteHomePanel";
import { ShieldAlert, ShieldCheck, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setNoteField } from "@/features/notes/redux/slice";
import { saveNote } from "@/features/notes/redux/thunks";
import { selectNoteById } from "@/features/notes/redux/selectors";
import {
  ContextAssignmentField,
  type ContextAssignmentSaveResult,
} from "@/features/scopes/components/context-assignment/ContextAssignmentField";
import { KgSuggestionsChip } from "@/features/kg-suggestions/components/KgSuggestionsChip";
import { useEntityScopes } from "@/features/scopes/hooks/useEntityScopes";
import type { AppDispatch } from "@/lib/redux/store";

/** Shared association adapter — identical for the footer and the tab icon. */
function noteSaveAdapter(dispatch: AppDispatch, noteId: string) {
  return (r: ContextAssignmentSaveResult) => {
    if (!r.ok) return;
    dispatch(
      setNoteField({
        id: noteId,
        field: "project_id",
        value: r.selection.projectIds[0] ?? null,
      }),
    );
    dispatch(
      setNoteField({
        id: noteId,
        field: "task_id",
        value: r.selection.taskIds[0] ?? null,
      }),
    );
    void dispatch(saveNote(noteId));
  };
}

export function NoteContextSection({
  noteId,
  embedded = false,
}: {
  noteId: string;
  /** Inside a sheet that already names the note: no card, no subject row. */
  embedded?: boolean;
}) {
  const dispatch = useAppDispatch();
  const note = useAppSelector(useMemo(() => selectNoteById(noteId), [noteId]));
  const onSaved = useMemo(
    () => noteSaveAdapter(dispatch, noteId),
    [dispatch, noteId],
  );
  if (!note) return null;
  return (
    <div className={embedded ? undefined : "my-2"}>
      <ContextAssignmentField
        mode="assignment"
        writeMode="live"
        hideSubject={embedded}
        className={embedded ? "rounded-none border-0 bg-transparent [&>div]:px-1" : undefined}
        subject={{
          entityType: "note",
          entityId: noteId,
          title: noteDisplayLabel(note),
          icon: StickyNote,
        }}
        organizationPicker={false}
        sectionHeight={embedded ? 380 : 260}
        onSaved={onSaved}
      />
      {/* Pending KG → scope-item fill suggestions for this note — the visible
          NER payoff. Renders nothing at count 0 (the chip self-hides). */}
      <KgSuggestionsChip
        filter={{ sourceKind: "note", sourceId: noteId }}
        className="mt-1.5"
      />
    </div>
  );
}

// Sized/shaped to match the tab strip's other action buttons (`actionBtnClass`
// in NoteTabItem — w-6 h-6, no border, [&_svg]:w-3.5 h-3.5). Opens THE note
// home panel (NoteHomePanel: Home + Also relates to) — the same panel the
// bottom-bar home button and the mobile dock open.
export function NoteContextStatusIcon({
  noteId,
  className,
}: {
  noteId: string;
  className?: string;
}) {
  const note = useAppSelector(useMemo(() => selectNoteById(noteId), [noteId]));
  const es = useEntityScopes({ entityType: "note", entityId: noteId });
  const [open, setOpen] = useState(false);
  if (!note) return null;
  const hasFkContext = !!(note.project_id || note.task_id);
  const hasContext = es.scopeIds.length > 0 || hasFkContext;
  const label = hasContext
    ? "Home and related scopes — click to review or change"
    : "Home — click to move it or relate it to scopes";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5",
            hasContext
              ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
            className,
          )}
        >
          {hasContext ? <ShieldCheck /> : <ShieldAlert />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70dvh] w-[380px] overflow-y-auto p-2">
        {open ? <NoteHomePanel noteId={noteId} onMoved={() => setOpen(false)} /> : null}
      </PopoverContent>
    </Popover>
  );
}
