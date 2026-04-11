"use client";

// Layer 2: NoteMetadataBar
// Shows folder, tags, scope assignments, org/project/task context, save status, word count.
// Title is handled by the tab (Layer 3) — NOT duplicated here.
// Props: noteId only. Everything from Redux.

import React, { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { FolderOpen, ChevronDown, X, Plus, Building2, Kanban, ListTodo, Tags } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  updateNoteFolder,
  updateNoteTags,
  setNoteField,
} from "../redux/slice";
import {
  selectNoteFolder,
  selectNoteTags,
  selectNoteIsDirtyById,
  selectNoteIsSavingById,
  selectNoteContent,
  selectAllFolders,
  selectNoteById,
} from "../redux/selectors";
import {
  selectOrganizationName,
  selectProjectName,
  selectTaskName,
  selectOrganizationId,
  selectProjectId,
  selectTaskId,
} from "@/features/agent-context/redux/appContextSlice";
import { ScopeTagsDisplay } from "@/features/agent-context/components/ScopeTagsDisplay";
import { cn } from "@/lib/utils";

const ScopePicker = dynamic(
  () => import("@/features/agent-context/components/ScopePicker").then(
    (mod) => ({ default: mod.ScopePicker }),
  ),
  { ssr: false },
);

interface NoteMetadataBarProps {
  noteId: string;
}

export function NoteMetadataBar({ noteId }: NoteMetadataBarProps) {
  const dispatch = useAppDispatch();

  const folder = useAppSelector(selectNoteFolder(noteId)) ?? "Draft";
  const tags = useAppSelector(selectNoteTags(noteId)) ?? [];
  const isDirty = useAppSelector(selectNoteIsDirtyById(noteId));
  const isSaving = useAppSelector(selectNoteIsSavingById(noteId));
  const content = useAppSelector(selectNoteContent(noteId)) ?? "";
  const allFolders = useAppSelector(selectAllFolders);
  const note = useAppSelector(selectNoteById(noteId));

  // Current hierarchy context (from appContextSlice)
  const ctxOrgId = useAppSelector(selectOrganizationId);
  const ctxOrgName = useAppSelector(selectOrganizationName);
  const ctxProjId = useAppSelector(selectProjectId);
  const ctxProjName = useAppSelector(selectProjectName);
  const ctxTaskId = useAppSelector(selectTaskId);
  const ctxTaskName = useAppSelector(selectTaskName);

  // Note's assigned context
  const noteOrgId = note?.organization_id ?? null;
  const noteProjId = note?.project_id ?? null;
  const noteTaskId = note?.task_id ?? null;

  const [folderOpen, setFolderOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [scopePickerOpen, setScopePickerOpen] = useState(false);

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);

  const saveStatus = isSaving ? "Saving..." : isDirty ? "Unsaved" : "Saved";
  const statusColor = isSaving
    ? "text-yellow-500"
    : isDirty
      ? "text-amber-500"
      : "text-green-500";

  const handleFolderChange = useCallback(
    (f: string) => {
      dispatch(updateNoteFolder({ id: noteId, folder: f }));
      setFolderOpen(false);
    },
    [dispatch, noteId],
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      dispatch(updateNoteTags({ id: noteId, tags: tags.filter((t) => t !== tag) }));
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

  // Assign current context to note
  const handleAssignContext = useCallback(() => {
    if (ctxOrgId && !noteOrgId) {
      dispatch(setNoteField({ id: noteId, field: "organization_id", value: ctxOrgId }));
    }
    if (ctxProjId && !noteProjId) {
      dispatch(setNoteField({ id: noteId, field: "project_id", value: ctxProjId }));
    }
    if (ctxTaskId && !noteTaskId) {
      dispatch(setNoteField({ id: noteId, field: "task_id", value: ctxTaskId }));
    }
  }, [dispatch, noteId, ctxOrgId, ctxProjId, ctxTaskId, noteOrgId, noteProjId, noteTaskId]);

  const handleClearContext = useCallback(
    (field: "organization_id" | "project_id" | "task_id") => {
      dispatch(setNoteField({ id: noteId, field, value: null }));
      if (field === "organization_id") {
        dispatch(setNoteField({ id: noteId, field: "project_id", value: null }));
        dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
      }
      if (field === "project_id") {
        dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
      }
    },
    [dispatch, noteId],
  );

  const hasUnassignedContext = (ctxOrgId && !noteOrgId) || (ctxProjId && !noteProjId) || (ctxTaskId && !noteTaskId);

  // Resolve orgId for scope picker (use note's org, or active context org)
  const scopeOrgId = noteOrgId || ctxOrgId || null;

  return (
    <>
      <div className="flex items-center gap-2 py-1 px-4 border-t border-border/20 shrink-0 overflow-hidden min-h-[1.625rem]">
        {/* Folder selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setFolderOpen((v) => !v)}
            className="flex items-center gap-1 text-[0.625rem] text-muted-foreground hover:text-foreground cursor-pointer transition-colors [&_svg]:w-3 [&_svg]:h-3"
          >
            <FolderOpen />
            <span className="max-w-[80px] truncate">{folder}</span>
            <ChevronDown className="w-2! h-2! opacity-50" />
          </button>
          {folderOpen && (
            <div className="absolute left-0 bottom-full mb-1 z-50 min-w-[120px] max-h-[200px] overflow-auto py-1 bg-card/95 backdrop-blur-2xl border border-border rounded-lg shadow-lg">
              {allFolders.map((f) => (
                <button
                  key={f}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-[0.625rem] cursor-pointer transition-colors",
                    f === folder
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-accent",
                  )}
                  onClick={() => handleFolderChange(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Context pills (org/project/task) */}
        {noteOrgId && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full shrink-0">
            <Building2 className="w-2.5 h-2.5" />
            {ctxOrgName && noteOrgId === ctxOrgId ? ctxOrgName : "Org"}
            <button onClick={() => handleClearContext("organization_id")} className="cursor-pointer hover:text-foreground [&_svg]:w-2 [&_svg]:h-2"><X /></button>
          </span>
        )}
        {noteProjId && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full shrink-0">
            <Kanban className="w-2.5 h-2.5" />
            {ctxProjName && noteProjId === ctxProjId ? ctxProjName : "Project"}
            <button onClick={() => handleClearContext("project_id")} className="cursor-pointer hover:text-foreground [&_svg]:w-2 [&_svg]:h-2"><X /></button>
          </span>
        )}
        {noteTaskId && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-green-500/10 text-green-600 dark:text-green-400 rounded-full shrink-0">
            <ListTodo className="w-2.5 h-2.5" />
            {ctxTaskName && noteTaskId === ctxTaskId ? ctxTaskName : "Task"}
            <button onClick={() => handleClearContext("task_id")} className="cursor-pointer hover:text-foreground [&_svg]:w-2 [&_svg]:h-2"><X /></button>
          </span>
        )}
        {hasUnassignedContext && (
          <button
            onClick={handleAssignContext}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-full cursor-pointer transition-colors shrink-0"
            title="Assign current context to this note"
          >
            <Plus className="w-2.5 h-2.5" /> Context
          </button>
        )}

        {/* Scope tags (e.g., "Client: Acme", "Department: SEO") */}
        <ScopeTagsDisplay
          entityType="note"
          entityId={noteId}
          className="shrink-0 [&_.badge]:text-[0.5rem] [&_.badge]:py-0 [&_.badge]:px-1"
        />

        {/* Scope picker trigger */}
        {scopeOrgId && (
          <button
            onClick={() => setScopePickerOpen((v) => !v)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-full cursor-pointer transition-colors shrink-0"
            title="Assign to scopes"
          >
            <Tags className="w-2.5 h-2.5" />
          </button>
        )}

        {/* Tags */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-muted rounded-full text-muted-foreground shrink-0"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="cursor-pointer hover:text-foreground [&_svg]:w-2 [&_svg]:h-2"
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
                if (e.key === "Escape") { setAddingTag(false); setTagInput(""); }
              }}
              onBlur={handleAddTag}
              className="w-16 px-1 py-0.5 text-[0.5625rem] bg-muted rounded border border-border outline-none shrink-0"
              placeholder="tag..."
              style={{ fontSize: "16px" }}
            />
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer [&_svg]:w-2.5 [&_svg]:h-2.5 shrink-0"
            >
              <Plus />
            </button>
          )}
        </div>

        {/* Status + word count */}
        <span className={cn("text-[0.5625rem] shrink-0", statusColor)}>
          {saveStatus}
        </span>
        <span className="text-[0.5625rem] text-muted-foreground/50 shrink-0">
          {wordCount}w
        </span>
      </div>

      {/* Scope picker popover — rendered below the metadata bar */}
      {scopePickerOpen && scopeOrgId && (
        <div className="border-t border-border/20 px-4 py-2 bg-muted/20 shrink-0">
          <ScopePicker
            entityType="note"
            entityId={noteId}
            orgId={scopeOrgId}
          />
        </div>
      )}
    </>
  );
}
