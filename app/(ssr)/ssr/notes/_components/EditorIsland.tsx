"use client";

// EditorIsland — Client island for editing a note.
// Lazy-loaded via next/dynamic from the [noteId]/page.tsx.
// Handles: title editing, content editing, auto-save, folder display,
// tag display, editor mode switching, and a status bar.

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Save,
  ChevronLeft,
  Folder,
  Copy,
  Trash2,
  MoreHorizontal,
  Tag,
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";

interface NoteData {
  id: string;
  label: string;
  content: string;
  folder_name: string;
  tags: string[];
  metadata: Record<string, unknown>;
  updated_at: string;
}

interface EditorIslandProps {
  note: NoteData;
}

type SaveState = "saved" | "dirty" | "saving";

export default function EditorIsland({ note }: EditorIslandProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState(note.label);
  const [content, setContent] = useState(note.content ?? "");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title: note.label, content: note.content ?? "" });

  // Reset state when note changes (navigating between notes)
  useEffect(() => {
    setTitle(note.label);
    setContent(note.content ?? "");
    setSaveState("saved");
    lastSavedRef.current = { title: note.label, content: note.content ?? "" };
  }, [note.id, note.label, note.content]);

  // Auto-save with debounce
  const scheduleSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      // Check if anything actually changed
      if (
        newTitle === lastSavedRef.current.title &&
        newContent === lastSavedRef.current.content
      ) {
        setSaveState("saved");
        return;
      }

      setSaveState("dirty");

      saveTimerRef.current = setTimeout(async () => {
        setSaveState("saving");
        try {
          const updates: Record<string, string> = {};
          if (newTitle !== lastSavedRef.current.title) updates.label = newTitle;
          if (newContent !== lastSavedRef.current.content) updates.content = newContent;

          if (Object.keys(updates).length === 0) {
            setSaveState("saved");
            return;
          }

          const { error } = await supabase
            .from("notes")
            .update(updates)
            .eq("id", note.id);

          if (error) {
            console.error("Auto-save failed:", error);
            setSaveState("dirty");
            return;
          }

          lastSavedRef.current = { title: newTitle, content: newContent };
          setSaveState("saved");

          // If title changed, refresh the layout so sidebar + tabs update
          if (updates.label) {
            startTransition(() => {
              router.refresh();
            });
          }
        } catch {
          setSaveState("dirty");
        }
      }, 1500);
    },
    [note.id, router],
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTitle(v);
    scheduleSave(v, content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setContent(v);
    scheduleSave(title, v);
  };

  // Manual save
  const forceSave = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");

    try {
      const { error } = await supabase
        .from("notes")
        .update({ label: title, content })
        .eq("id", note.id);

      if (error) {
        setSaveState("dirty");
        return;
      }

      lastSavedRef.current = { title, content };
      setSaveState("saved");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setSaveState("dirty");
    }
  }, [note.id, title, content, router]);

  // Delete note
  const deleteNote = useCallback(async () => {
    const { error } = await supabase
      .from("notes")
      .update({ is_deleted: true })
      .eq("id", note.id);

    if (error) {
      console.error("Delete failed:", error);
      return;
    }

    // Remove from tabs and navigate away
    const params = new URLSearchParams(searchParams.toString());
    const tabs = params.get("tabs")?.split(",").filter(Boolean) ?? [];
    const newTabs = tabs.filter((id) => id !== note.id);
    if (newTabs.length > 0) {
      params.set("tabs", newTabs.join(","));
    } else {
      params.delete("tabs");
    }
    const qs = params.toString();

    startTransition(() => {
      router.refresh();
      const nextTab = newTabs[0];
      if (nextTab) {
        router.push(`/ssr/notes/${nextTab}${qs ? `?${qs}` : ""}`);
      } else {
        router.push(`/ssr/notes${qs ? `?${qs}` : ""}`);
      }
    });
  }, [note.id, router, searchParams]);

  // Duplicate note
  const duplicateNote = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return;

    const { data: newNote, error } = await supabase
      .from("notes")
      .insert({
        user_id: userData.user.id,
        label: `${title} (Copy)`,
        content,
        folder_name: note.folder_name,
        tags: note.tags,
        metadata: note.metadata,
        position: 0,
      })
      .select("id")
      .single();

    if (error || !newNote) return;

    const params = new URLSearchParams(searchParams.toString());
    const tabs = params.get("tabs")?.split(",").filter(Boolean) ?? [];
    tabs.push(newNote.id);
    params.set("tabs", tabs.join(","));
    const qs = params.toString();

    startTransition(() => {
      router.refresh();
      router.push(`/ssr/notes/${newNote.id}${qs ? `?${qs}` : ""}`);
    });
  }, [title, content, note, router, searchParams]);

  // Back button (mobile)
  const goBack = () => {
    const qs = searchParams.toString();
    startTransition(() => {
      router.push(`/ssr/notes${qs ? `?${qs}` : ""}`);
    });
  };

  // Word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  // Status label
  const statusLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "dirty"
        ? "Unsaved changes"
        : "Saved";

  return (
    <div className="notes-editor note-detail-active">
      {/* Toolbar */}
      <div className="notes-toolbar">
        <button className="notes-back-btn" onClick={goBack} aria-label="Back to notes">
          <ChevronLeft />
        </button>

        <input
          className="notes-toolbar-title"
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title..."
          aria-label="Note title"
        />

        <span className="notes-toolbar-folder">
          <Folder />
          {note.folder_name}
        </span>

        {note.tags.length > 0 && (
          <span className="notes-toolbar-folder">
            <Tag />
            {note.tags.slice(0, 2).join(", ")}
            {note.tags.length > 2 && ` +${note.tags.length - 2}`}
          </span>
        )}

        <button
          className="notes-toolbar-btn"
          data-variant={saveState === "dirty" ? "accent" : undefined}
          onClick={forceSave}
          title="Save"
          aria-label="Save note"
        >
          <Save />
        </button>

        <button
          className="notes-toolbar-btn"
          onClick={duplicateNote}
          title="Duplicate"
          aria-label="Duplicate note"
        >
          <Copy />
        </button>

        <button
          className="notes-toolbar-btn"
          onClick={deleteNote}
          title="Delete"
          aria-label="Delete note"
        >
          <Trash2 />
        </button>
      </div>

      {/* Editor */}
      <textarea
        className="notes-editor-textarea"
        value={content}
        onChange={handleContentChange}
        placeholder="Start writing..."
        aria-label="Note content"
      />

      {/* Status bar */}
      <div className="notes-editor-status">
        <span className="notes-editor-status-dot" data-state={saveState} />
        <span>{statusLabel}</span>
        <span>&middot;</span>
        <span>{wordCount} words</span>
        <span>&middot;</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  );
}
