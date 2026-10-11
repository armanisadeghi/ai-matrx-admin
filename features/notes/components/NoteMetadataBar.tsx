"use client";

// Layer 2: NoteMetadataBar — THE bottom row of every note host: the note's
// home chip (where it lives; click to move it), scopes, tags … save status + counts (NoteStatsFooter, rendered here) … the
// note's copy pair. ONE row in every host (/notes, the notes window, a Board
// tile, education): a host never adds a second stats strip below it (two
// stacked rows cost ~35px of writing space and drew the same facts twice).
//
// Props: noteId only (+ optional variant). Everything from Redux.

import { EntityCustomFields } from "@/features/unified-data/components/EntityCustomFields";
import React, { useState, useCallback } from "react";
import {
  X,
  Plus,
  Network,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { updateNoteTags } from "../redux/slice";
import {
  selectNoteTags,
  selectNoteById,
} from "../redux/selectors";
import {
  selectProjectName,
  selectTaskName,
  selectProjectId,
  selectTaskId,
} from "@/lib/redux/slices/appContextSlice";
import { ScopeTagsDisplay } from "@/features/agent-context/components/ScopeTagsDisplay";
import TaskChipRow from "@/features/tasks/widgets/TaskChipRow";
import { cn } from "@/lib/utils";
import { NoteContextSection } from "./NoteContextSection";
import { HomeChip } from "../homes/HomePicker";
import { NoteStatsFooter } from "./NoteStatsFooter";
import { RichCopySplit } from "@ai-matrx/chat/agent-copy/RichCopySplit";
import { noteIdentityContentSource } from "@/features/notes/richDocumentSource";
import { richDocumentViewKey } from "@ai-matrx/rich-content/rich-document/runtime/useActionSurfaceProvider";
import { getNoteLiveContent } from "../utils/noteLiveContent";
import {
  noteDisplayLabel,
  noteLocation,
  noteRecordData,
  noteRecordMetaData,
  noteRecordSummary,
  type NoteRecordView,
} from "@/features/notes/format";
import { LinkedRecordsSection } from "@/features/scopes/components/linked-records/LinkedRecordsSection";

interface NoteMetadataBarProps {
  noteId: string;
  /**
   * `chrome` (default) — thin strip above the stats footer; owns its own
   * top border. `slot` — for rare cases where a parent already frames it.
   */
  variant?: "chrome" | "slot";
}

export function NoteMetadataBar({
  noteId,
  variant = "chrome",
}: NoteMetadataBarProps) {
  const dispatch = useAppDispatch();

  const tags = useAppSelector(selectNoteTags(noteId));
  const note = useAppSelector(selectNoteById(noteId));

  const ctxProjId = useAppSelector(selectProjectId);
  const ctxProjName = useAppSelector(selectProjectName);
  const ctxTaskId = useAppSelector(selectTaskId);
  const ctxTaskName = useAppSelector(selectTaskName);

  const noteProjId = note?.project_id ?? null;
  const noteTaskId = note?.task_id ?? null;

  /**
   * The record view for agent-copy, assembled at CLICK time (never memoized on
   * the saved row): `_dirtyFields` is a Set, and `_error` is the exact sentence
   * the save-failure banner renders. `content` is the store buffer, which the
   * editor's debounced flush keeps current — a note the user is mid-keystroke
   * on can trail by one debounce, and the payload says so via `unsaved_changes`
   * rather than pretending the row is authoritative.
   */
  const buildRecordView = useCallback((): NoteRecordView => {
    if (!note) {
      throw new Error("buildRecordView called with no note loaded");
    }
    return {
      note,
      content: note.content ?? null,
      dirtyFields: note._dirtyFields ? [...note._dirtyFields] : [],
      error: note._error ?? null,
      saving: !!note._saving,
      consecutiveSaveFailures: note._consecutiveSaveFailures ?? 0,
    };
  }, [note]);

  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [scopePickerOpen, setScopePickerOpen] = useState(false);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      dispatch(
        updateNoteTags({ id: noteId, tags: tags.filter((t) => t !== tag) }),
      );
    },
    [dispatch, noteId, tags],
  );

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      dispatch(updateNoteTags({ id: noteId, tags: [...tags, trimmed] }));
    }
    setTagInput("");
    setAddingTag(false);
  }, [dispatch, noteId, tags, tagInput]);

  return (
    <>
      {scopePickerOpen && (
        <div className="relative z-10 shrink-0 border-t border-border/20 bg-background px-2">
          <NoteContextSection noteId={noteId} />
          {/* The organization's own fields on this note (lane 7 W5): the note's context panel, the
              info area the notes page already has, on the page and in the notes window alike. */}
          <EntityCustomFields
            entityToken="note"
            recordId={noteId}
            organizationId={note?.organization_id ?? null}
            className="py-2"
          />
          {/* Everything linked to this note, both ways (W1.4). */}
          <LinkedRecordsSection backLinksShownElsewhere token="note" id={noteId} title={note?.label ?? ""} className="flex flex-col gap-1.5 pb-2" />
        </div>
      )}

      <div
        className={cn(
          "@container/notemeta relative z-10 flex h-7 min-h-0 shrink-0 items-center gap-1.5 overflow-hidden px-2",
          variant === "chrome" && "border-t border-border/20 bg-background",
        )}
      >
        <HomeChip noteId={noteId} className="shrink-0" />

        <button
          type="button"
          onClick={() => setScopePickerOpen((v) => !v)}
          className={cn(
            // Shrinks (label truncates) before the save status ever would.
            "flex min-w-0 shrink items-center gap-1 overflow-hidden whitespace-nowrap rounded-full px-1.5 py-0 text-xs transition-colors [&_svg]:shrink-0",
            noteProjId || noteTaskId
              ? "bg-primary/10 text-primary-ink"
              : "border border-dashed border-border text-muted-foreground hover:text-primary",
          )}
          title="Set scopes for this note"
        >
          <Network className="h-3 w-3" />
          {noteTaskId
            ? ctxTaskName && noteTaskId === ctxTaskId
              ? ctxTaskName
              : "Task"
            : noteProjId
              ? ctxProjName && noteProjId === ctxProjId
                ? ctxProjName
                : "Project"
              : "Scopes"}
        </button>
        <ScopeTagsDisplay
          entityType="note"
          entityId={noteId}
          className="shrink-0 [&_.badge]:px-1.5 [&_.badge]:py-0 [&_.badge]:text-[0.625rem]"
        />
        <TaskChipRow
          entityType="note"
          entityId={noteId}
          label={undefined}
          size="xs"
          className="shrink-0"
        />

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted pl-1.5 pr-1 py-0 text-[0.625rem] text-foreground"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => handleRemoveTag(tag)}
                className="cursor-pointer text-muted-foreground hover:text-foreground [&_svg]:h-2.5 [&_svg]:w-2.5"
              >
                <X />
              </button>
            </span>
          ))}
          {addingTag ? (
            <input
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTag();
                if (e.key === "Escape") {
                  setAddingTag(false);
                  setTagInput("");
                }
              }}
              onBlur={handleAddTag}
              className="w-24 shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs outline-none focus:border-primary"
              placeholder="Add tag…"
              style={{ fontSize: "16px" }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingTag(true)}
              className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary [&_svg]:h-3 [&_svg]:w-3"
              title="Add tag"
            >
              <Plus />
            </button>
          )}
        </div>

        {/* Save status + counts. Clipped: in a crowded row the counts step
            down (container query) and never paint over the copy pair. */}
        <div className="ml-auto flex shrink-0 items-center">
          <NoteStatsFooter noteId={noteId} />
        </div>

        {/*
         * The note RECORD pair. A note's body is the highest-value AI capture
         * in the app, so this is the one control that carries it. Built at
         * click time from the LIVE store record — dirty fields and any save
         * error the user is staring at come first in the payload, never a
         * saved-row snapshot.
         */}
        {note && (
          <RichCopySplit
            size="xs"
            label={`Note "${noteDisplayLabel(note)}"`}
            references={[{ id: note.id, label: "Copy note reference", noun: "note", items: [{ id: note.id, label: noteDisplayLabel(note) }] }]}
            className="shrink-0"
            // Plain flips the note's Read view (its RichDocument keys the same item).
            viewKey={richDocumentViewKey(noteIdentityContentSource(note.id), "")}
            exportTitle={noteDisplayLabel(note)}
            // Copy / Copy as → Text and Markdown carry the NOTE: its live
            // markdown, nothing else. The record summary (metadata, save
            // state, "--- Body ---") is the AI copy below, never the person's.
            human={() => getNoteLiveContent(note.id) ?? note.content ?? ""}
            contentFlavor="markdown"
            json={() => noteRecordData(buildRecordView())}
            agent={() => {
              const view = buildRecordView();
              return {
                kind: "note-record",
                location: noteLocation("Editor"),
                description:
                  "The note currently open in the editor — body, metadata, unsaved-change state and any save error.",
                data: noteRecordData(view),
                summary: noteRecordSummary(view),
                attributes: {
                  id: view.note.id,
                  label: noteDisplayLabel(view.note),
                  home: view.note.home_scope_id ?? undefined,
                  words: noteRecordData(view).word_count,
                  unsaved: view.dirtyFields.length > 0,
                  save_error: view.error ?? undefined,
                },
              };
            }}
            agentVariant={{
              id: "note-full",
              label: "Note (with body)",
              hint: "Everything on screen, body included",
              position: "first",
            }}
            aiVariants={[
              {
                id: "note-metadata",
                label: "Metadata only",
                hint: "Home, tags, scopes and save state — no body",
                build: () => {
                  const view = buildRecordView();
                  return {
                    kind: "note-record",
                    location: noteLocation("Editor"),
                    description:
                      "The open note's metadata and live save state, with the body deliberately omitted.",
                    data: noteRecordMetaData(view),
                    attributes: {
                      id: view.note.id,
                      label: noteDisplayLabel(view.note),
                      detail: "metadata-only",
                      unsaved: view.dirtyFields.length > 0,
                    },
                  };
                },
              },
            ]}
          />
        )}
      </div>

    </>
  );
}
