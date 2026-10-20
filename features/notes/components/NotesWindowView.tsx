"use client";

// NotesWindowView — the notes WORKSPACE BODY for the floating window.
//
// Pure content only: tab bar + presence + editor (with split). The version-
// history panel is NOT here — on desktop it's the WindowPanel `secondaryPanel`
// slot (wired in NotesWindow), on mobile it's a Drawer rendered below. Every
// piece of chrome (header view-controls, footer metadata, left note tree, right
// history) is a WindowPanel slot, never body content.
//
// Takes ONLY instanceId; every value comes from Redux selectors. ZERO PROP
// DRILLING.

import { HomePickerDialog } from "../homes/HomePicker";
import React, { useCallback, useEffect, useRef } from "react";
import { surfaceOwnsKey } from "@ai-matrx/kit/keyboard-scope";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  setInstanceActiveTab,
  removeInstanceTab,
  markTabInteraction,
  closeSplit,
} from "../redux/slice";
import { fetchNoteContent, saveNote } from "../redux/thunks";
import {
  selectInstanceActiveTab,
  selectInstanceTabs,
  selectInstanceSplitNoteId,
  selectNoteLabel,
} from "../redux/selectors";
import { NotesInstanceProvider } from "../context/NotesInstanceContext";
import { NoteContentEditor } from "./NoteContentEditor";
import { NoteTabBar } from "./NoteTabBar";
import { NotePresenceBanner } from "./NotePresenceBanner";
import { NoteMetadataBar } from "./NoteMetadataBar";
import { HomeQuickPick } from "../homes/HomeQuickPick";
import { cn } from "@/lib/utils";
import { FormatButtons } from "@ai-matrx/rich-content/editor/format/FormatButtons";
import { formatTargetWithin } from "@ai-matrx/rich-content/editor/format/format-target";
import { useNoteEditorMode } from "../hooks/usePreferredDefaultEditorMode";

export interface NotesWindowViewProps {
  instanceId: string;
  showTabs?: boolean;
  /** Forwarded to NoteTabBar — false for floating windows (default). */
  syncUrl?: boolean;
  className?: string;
}

export function NotesWindowView({
  instanceId,
  showTabs = true,
  syncUrl = false,
  className,
}: NotesWindowViewProps) {
  const dispatch = useAppDispatch();
  const [movePickerNoteId, setMovePickerNoteId] = React.useState<string | null>(null);

  const activeTabId = useAppSelector(selectInstanceActiveTab(instanceId));
  const openTabs = useAppSelector(selectInstanceTabs(instanceId));
  const splitNoteId = useAppSelector(selectInstanceSplitNoteId(instanceId));
  const activeEditorMode = useNoteEditorMode(activeTabId ?? "");
  const splitNoteLabel = useAppSelector(
    splitNoteId ? selectNoteLabel(splitNoteId) : () => undefined,
  );


  // ── Keyboard shortcuts (save / close tab / cycle tab) ──────────────
  // Answered only for keys pressed in THIS view (utils/keyboard-scope): a
  // board or a panel mounts several, and each must not act at once.
  const shortcutRootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!surfaceOwnsKey(e, shortcutRootRef.current)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        if (activeTabId) dispatch(saveNote(activeTabId));
        return;
      }
      if (mod && e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          dispatch(markTabInteraction({ instanceId }));
          dispatch(removeInstanceTab({ instanceId, noteId: activeTabId }));
        }
        return;
      }
      // Ctrl/⌘+Shift+M — move the active note (the home picker).
      if (mod && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (activeTabId) setMovePickerNoteId(activeTabId);
        return;
      }
      if (mod && e.key === "Tab") {
        e.preventDefault();
        if (openTabs && openTabs.length > 1 && activeTabId) {
          const idx = openTabs.indexOf(activeTabId);
          const next = openTabs[(idx + 1) % openTabs.length];
          dispatch(markTabInteraction({ instanceId }));
          dispatch(setInstanceActiveTab({ instanceId, noteId: next }));
          dispatch(fetchNoteContent(next));
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, instanceId, activeTabId, openTabs]);

  return (
    <NotesInstanceProvider value={instanceId}>
      <div
        ref={shortcutRootRef}
      // The note's frame, chrome included (tabs, toolbar, status bar), is the document: the page
      // assistant's dock never reveals over it (review 3 2026-10-20 R1; guard a-notes-chrome-is-the-document).
        data-document-surface=""
        className={cn("flex h-full min-h-0 w-full flex-col", className)}
      >
        {/* Editor column (tab bar + presence + editor / split / empty) */}
        <div className="flex h-full min-h-0 flex-col">
          {showTabs && <NoteTabBar instanceId={instanceId} syncUrl={syncUrl} />}
          <NotePresenceBanner instanceId={instanceId} />
          {/* THE formatting toolbar — the same one /notes and the Board draw, in
              every editing mode and never in Read. The window header only has
              room for the mode switch + note tools, so it sits in its own row;
              what does not fit folds into its More menu. */}
          {activeTabId && activeEditorMode !== "preview" && (
            <div className="@container flex h-9 shrink-0 items-center border-b border-border/40 px-1.5">
              <FormatButtons
                size="xs"
                className="flex-1"
                resolve={() => formatTargetWithin(shortcutRootRef.current)}
              />
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1">
              {activeTabId ? (
                splitNoteId ? (
                  <div className="flex min-h-0 flex-1">
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                      <NoteContentEditor noteId={activeTabId} embedded />
                    </div>
                    <div className="w-px shrink-0 bg-border" />
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-2 py-0.5">
                        <span className="truncate text-[0.625rem] font-medium text-muted-foreground">
                          {splitNoteLabel ?? "Split Note"}
                        </span>
                        <button
                          type="button"
                          onClick={() => dispatch(closeSplit(instanceId))}
                          className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                          title="Close split"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <NoteContentEditor noteId={splitNoteId} embedded />
                    </div>
                  </div>
                ) : (
                  <NoteContentEditor noteId={activeTabId} embedded />
                )
              ) : (
                <HomeQuickPick instanceId={instanceId} />
              )}
            </div>
            {/* The note's one bottom row (folder · tags … saved · counts · copy). */}
            {activeTabId && <NoteMetadataBar noteId={activeTabId} />}
        <HomePickerDialog
          open={movePickerNoteId !== null}
          onOpenChange={(open) => { if (!open) setMovePickerNoteId(null); }}
          noteIds={movePickerNoteId ? [movePickerNoteId] : []}
        />
          </div>
        </div>
      </div>
    </NotesInstanceProvider>
  );
}
