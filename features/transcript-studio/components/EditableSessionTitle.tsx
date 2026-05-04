"use client";

/**
 * Click-to-edit session title. Used in the active-session header and any
 * other surface that needs inline rename. On blur or Enter, dispatches an
 * update; Escape cancels. Falls back to the prior title on whitespace-only
 * input. Empty input becomes the platform default.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { updateSessionThunk } from "../redux/thunks";
import { NEW_SESSION_DEFAULT_TITLE } from "../constants";

interface EditableSessionTitleProps {
  sessionId: string;
  title: string;
  className?: string;
  /** Auto-select all text on edit start. Default true. */
  selectOnEdit?: boolean;
  /** Truncate display when not editing. Default true. */
  truncate?: boolean;
}

export function EditableSessionTitle({
  sessionId,
  title,
  className,
  selectOnEdit = true,
  truncate = true,
}: EditableSessionTitleProps) {
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Stay in sync if the upstream title changes (e.g. realtime / auto-label)
  // while we're not actively editing.
  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (selectOnEdit) inputRef.current.select();
    }
  }, [editing, selectOnEdit]);

  const startEdit = useCallback(() => {
    setDraft(title);
    setEditing(true);
  }, [title]);

  const commit = useCallback(() => {
    const next = draft.trim() || NEW_SESSION_DEFAULT_TITLE;
    setEditing(false);
    if (next === title) return;
    void dispatch(updateSessionThunk({ id: sessionId, patch: { title: next } }));
  }, [draft, title, sessionId, dispatch]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft(title);
  }, [title]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        maxLength={120}
        aria-label="Session title"
        className={cn(
          "rounded-sm bg-transparent px-1 text-sm font-semibold outline-none",
          "focus:bg-background focus:ring-1 focus:ring-ring",
          "min-w-0 w-full",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEdit();
        }
      }}
      title="Click to rename"
      aria-label={`Rename session: ${title}`}
      className={cn(
        "min-w-0 max-w-full text-left text-sm font-semibold",
        "rounded-sm px-1 transition-colors",
        "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        truncate && "truncate block",
        className,
      )}
    >
      {title || NEW_SESSION_DEFAULT_TITLE}
    </button>
  );
}
