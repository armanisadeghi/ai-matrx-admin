"use client";

// Layer 2: NoteMetadataBar
// Bottom bar showing: folder, tags, scope assignments, save status, word count.
// Expandable assignment panel for org/project/task/scopes.
// All assignments are note-specific — NOT derived from sidebar filter.

import React, { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  FolderOpen,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Building2,
  Kanban,
  ListTodo,
  Tags,
  Settings2,
} from "lucide-react";
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
import { selectOrganizationId } from "@/features/agent-context/redux/appContextSlice";
import { ScopeTagsDisplay } from "@/features/agent-context/components/ScopeTagsDisplay";
import { useUserOrganizations } from "@/features/organizations/hooks";
import { cn } from "@/lib/utils";

const ScopePicker = dynamic(
  () =>
    import("@/features/agent-context/components/ScopePicker").then((mod) => ({
      default: mod.ScopePicker,
    })),
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
  const activeOrgId = useAppSelector(selectOrganizationId);

  // Note's current assignments
  const noteOrgId = note?.organization_id ?? null;
  const noteProjId = note?.project_id ?? null;
  const noteTaskId = note?.task_id ?? null;

  // Org list for picker
  const { organizations } = useUserOrganizations();

  const [folderOpen, setFolderOpen] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

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

  // Assignment handlers — each is independent, not auto-derived from sidebar
  const handleSetOrg = useCallback(
    (orgId: string | null) => {
      dispatch(setNoteField({ id: noteId, field: "organization_id", value: orgId }));
      if (!orgId) {
        dispatch(setNoteField({ id: noteId, field: "project_id", value: null }));
        dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
      }
    },
    [dispatch, noteId],
  );

  const handleSetProject = useCallback(
    (projId: string | null) => {
      dispatch(setNoteField({ id: noteId, field: "project_id", value: projId }));
      if (!projId) {
        dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
      }
    },
    [dispatch, noteId],
  );

  const handleSetTask = useCallback(
    (taskId: string | null) => {
      dispatch(setNoteField({ id: noteId, field: "task_id", value: taskId }));
    },
    [dispatch, noteId],
  );

  // Resolve orgId for scope picker
  const scopeOrgId = noteOrgId || activeOrgId || null;

  // Count of active assignments for the badge
  const assignmentCount =
    (noteOrgId ? 1 : 0) + (noteProjId ? 1 : 0) + (noteTaskId ? 1 : 0);

  return (
    <>
      {/* ── Compact bar (always visible) ──────────────────────────────── */}
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

        {/* Scope tags (compact badges) */}
        <ScopeTagsDisplay
          entityType="note"
          entityId={noteId}
          className="shrink-0 [&_.badge]:text-[0.5rem] [&_.badge]:py-0 [&_.badge]:px-1"
        />

        {/* Assignment summary pills */}
        {noteOrgId && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full shrink-0">
            <Building2 className="w-2.5 h-2.5" />
            Org
          </span>
        )}
        {noteProjId && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full shrink-0">
            <Kanban className="w-2.5 h-2.5" />
            Proj
          </span>
        )}
        {noteTaskId && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] bg-green-500/10 text-green-600 dark:text-green-400 rounded-full shrink-0">
            <ListTodo className="w-2.5 h-2.5" />
            Task
          </span>
        )}

        {/* Expand assignment panel button */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={cn(
            "flex items-center gap-0.5 px-1.5 py-0.5 text-[0.5625rem] rounded-full cursor-pointer transition-colors shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5",
            panelOpen
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground border border-dashed border-border/50",
          )}
          title="Assign to org, project, task, or scopes"
        >
          <Settings2 />
          {assignmentCount > 0 && (
            <span className="tabular-nums">{assignmentCount}</span>
          )}
          {panelOpen ? <ChevronDown /> : <ChevronUp />}
        </button>

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
                if (e.key === "Escape") {
                  setAddingTag(false);
                  setTagInput("");
                }
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

      {/* ── Expanded assignment panel ──────────────────────────────────── */}
      {panelOpen && (
        <div className="border-t border-border/20 px-4 py-3 bg-muted/10 shrink-0 space-y-3">
          <p className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider">
            Assignments
          </p>

          {/* Organization picker */}
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <select
              value={noteOrgId || ""}
              onChange={(e) => handleSetOrg(e.target.value || null)}
              className="flex-1 text-xs bg-transparent border border-border/50 rounded px-2 py-1 outline-none cursor-pointer"
            >
              <option value="">No organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {noteOrgId && (
              <button
                onClick={() => handleSetOrg(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer [&_svg]:w-3 [&_svg]:h-3"
              >
                <X />
              </button>
            )}
          </div>

          {/* Project picker — placeholder (needs project list for selected org) */}
          <div className="flex items-center gap-2">
            <Kanban className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <div className="flex-1 text-xs text-muted-foreground">
              {noteProjId ? (
                <span className="flex items-center gap-1">
                  Project: {noteProjId.slice(0, 8)}...
                  <button
                    onClick={() => handleSetProject(null)}
                    className="cursor-pointer hover:text-foreground [&_svg]:w-3 [&_svg]:h-3"
                  >
                    <X />
                  </button>
                </span>
              ) : (
                <span className="italic">
                  {noteOrgId ? "Select project in context first" : "Set organization first"}
                </span>
              )}
            </div>
          </div>

          {/* Task picker — placeholder */}
          <div className="flex items-center gap-2">
            <ListTodo className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <div className="flex-1 text-xs text-muted-foreground">
              {noteTaskId ? (
                <span className="flex items-center gap-1">
                  Task: {noteTaskId.slice(0, 8)}...
                  <button
                    onClick={() => handleSetTask(null)}
                    className="cursor-pointer hover:text-foreground [&_svg]:w-3 [&_svg]:h-3"
                  >
                    <X />
                  </button>
                </span>
              ) : (
                <span className="italic">
                  {noteProjId ? "Select task in context first" : "Set project first"}
                </span>
              )}
            </div>
          </div>

          {/* Scope picker */}
          {scopeOrgId && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Tags className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[0.625rem] text-muted-foreground">Scopes</span>
              </div>
              <ScopePicker
                entityType="note"
                entityId={noteId}
                orgId={scopeOrgId}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
