"use client";

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectNoteLabel } from "@/features/notes/redux/selectors";
import { NoteVersionHistoryPanel } from "./NoteVersionHistoryPanel";

interface NoteVersionDiffPageProps {
  noteId: string;
}

export function NoteVersionDiffPage({ noteId }: NoteVersionDiffPageProps) {
  const noteLabel = useAppSelector(selectNoteLabel(noteId));

  return (
    <>
      <RecordPageHeader
        backHref={`/notes/${noteId}`}
        parents={[{ label: "Notes", href: "/notes" }]}
        // The record is the NOTE (its crumb opens every other note's versions — record-siblings
        // `note`); this page is its Versions view.
        record={{ name: noteLabel || "Note", token: "note", id: noteId }}
        modes={[
          { name: "Note", href: `/notes/${noteId}` },
          { name: "Versions", href: `/notes/${noteId}/diff` },
        ]}
      />
      <div className="flex h-full flex-col overflow-hidden">
        <NoteVersionHistoryPanel noteId={noteId} variant="page" />
      </div>
    </>
  );
}
