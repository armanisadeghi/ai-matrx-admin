"use client";

// features/notes/homes/HomePicker.tsx
//
// Notes' two hosts of THE shared home picker (`features/scopes/homes/
// HomePickerList`): the bottom-bar chip (popover) and every "Move to…" menu /
// the bulk bar (dialog; a plain Dialog is a bottom sheet on phones). Picking a
// home moves the note(s) through `moveNoteToHome` and closes.

import React, { useMemo, useState } from "react";
import { House } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { HomePickerList } from "@/features/scopes/homes/HomePickerList";
import type { ItemHome } from "@/features/scopes/homes/homeModel";
import { selectNoteById } from "../redux/selectors";
import { moveNoteToHome, moveNotesToHome } from "./moveNoteToHome";
import { useNoteHomes } from "./useNoteHomes";

/** "Move to…" for one note or many (any mix of organizations). */
export function HomePickerDialog({
  open,
  onOpenChange,
  noteIds,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteIds: readonly string[];
  onMoved?: () => void;
}) {
  const dispatch = useAppDispatch();
  const firstId = noteIds[0] ?? "";
  const first = useAppSelector(useMemo(() => selectNoteById(firstId), [firstId]));
  const [busy, setBusy] = useState(false);

  const pick = async (home: ItemHome, label: string) => {
    if (busy || noteIds.length === 0) return;
    setBusy(true);
    try {
      if (noteIds.length === 1) {
        const result = await dispatch(
          moveNoteToHome({ noteId: noteIds[0], scopeId: home.scopeId, homeLabel: label }),
        ).unwrap();
        if (!result.ok) return;
      } else {
        const result = await dispatch(
          moveNotesToHome({ noteIds, scopeId: home.scopeId, homeLabel: label }),
        ).unwrap();
        if (result.moved === 0) return;
      }
      onMoved?.();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-2 p-3 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {noteIds.length === 1 ? "Move note to…" : `Move ${noteIds.length} notes to…`}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <HomePickerList
            currentScopeId={noteIds.length === 1 ? (first?.home_scope_id ?? null) : null}
            initialOrganizationId={first?.organization_id ?? null}
            onPick={pick}
            busy={busy}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** The note's home, as one chip: shows where it lives; click to move it. */
export function HomeChip({ noteId, className }: { noteId: string; className?: string }) {
  const dispatch = useAppDispatch();
  const note = useAppSelector(useMemo(() => selectNoteById(noteId), [noteId]));
  const { labelOf } = useNoteHomes();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!note) return null;
  const label = labelOf(note.home_scope_id) ?? (note.home_scope_id ? "Home" : "General");

  const pick = async (home: ItemHome, homeLabel: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await dispatch(
        moveNoteToHome({ noteId, scopeId: home.scopeId, homeLabel }),
      ).unwrap();
      if (result.ok) setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`Home: ${label}`}
          aria-label={`Home: ${label}. Move this note`}
          data-note-home-chip
          className={cn(
            "inline-flex max-w-[220px] items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
            className,
          )}
        >
          <House className="h-3 w-3 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[320px] flex-col p-0">
        {open ? (
          <HomePickerList
            currentScopeId={note.home_scope_id ?? null}
            initialOrganizationId={note.organization_id}
            onPick={pick}
            busy={busy}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
