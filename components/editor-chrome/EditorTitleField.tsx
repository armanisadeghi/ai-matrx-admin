"use client";

/**
 * The document's title, edited where it sits (Google Docs / Sheets): plain
 * text until hovered, a field when clicked, as wide as its words, saved on
 * Enter or blur, Escape puts the saved name back. A peer's rename arrives
 * through `value` (the host keeps it live) and replaces the text unless this
 * person is mid-edit.
 */

import { useEffect, useRef, useState } from "react";
import { CloudAlert, CloudCheck, CloudOff, CloudUpload, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function EditorTitleField({
  value,
  onCommit,
  editable,
  placeholder,
  maxLength = 200,
  className,
}: {
  value: string;
  /** Persist the new name; throw to put the old one back. */
  onCommit: (next: string) => Promise<void>;
  editable: boolean;
  placeholder: string;
  maxLength?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const editingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  // A saved or remote rename lands here; never stomp on what is being typed.
  useEffect(() => {
    if (!editingRef.current) setDraft(value);
  }, [value]);

  const commit = async () => {
    editingRef.current = false;
    const next = draft.trim();
    if (!next || next === value) {
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      await onCommit(next);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className={cn("relative inline-grid min-w-[3rem] max-w-full shrink", className)} data-editor-title="">
      {/* The invisible twin sizes the field to its words (auto-width, no measuring). */}
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre px-1.5 text-lg leading-7">
        {draft || placeholder}
      </span>
      {/* ui-exception: a title edited in place (Google's document title), not a form field. */}
      <input
        value={draft}
        readOnly={!editable}
        maxLength={maxLength}
        aria-label="Rename"
        title={editable ? "Rename" : value}
        placeholder={placeholder}
        size={1}
        onFocus={(e) => {
          if (!editable) return;
          editingRef.current = true;
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            editingRef.current = false;
            setDraft(value);
            requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
          }
        }}
        className={cn(
          "col-start-1 row-start-1 w-full min-w-0 truncate rounded border border-transparent bg-transparent px-1.5 text-lg leading-7 text-foreground outline-none",
          editable && "hover:border-border focus:border-primary",
          saving && "text-muted-foreground",
        )}
      />
    </span>
  );
}

export type EditorSaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

/** Google's cloud mark beside the title; pressing it saves now. */
export function EditorSaveStatus({
  state,
  onSaveNow,
}: {
  state: EditorSaveState;
  onSaveNow?: () => void;
}) {
  const online = useOnline();
  const view = !online
    ? { Icon: CloudOff, label: "Offline — changes save when you reconnect", tone: "text-amber-600 dark:text-amber-500" }
    : state === "saving"
      ? { Icon: Loader2, label: "Saving…", tone: "text-muted-foreground animate-spin" }
      : state === "dirty"
        ? { Icon: CloudUpload, label: "Unsaved changes — save now", tone: "text-muted-foreground" }
        : state === "error"
          ? { Icon: CloudAlert, label: "Save failed — try again", tone: "text-destructive" }
          : state === "conflict"
            ? { Icon: CloudAlert, label: "Changed elsewhere", tone: "text-amber-600 dark:text-amber-500" }
            : { Icon: CloudCheck, label: "All changes saved", tone: "text-muted-foreground" };
  const { Icon } = view;
  return (
    // ui-exception: Google's 24px status mark in the title row; it reports state first, saves second.
    <button
      type="button"
      aria-label={view.label}
      title={view.label}
      data-editor-save-status={online ? state : "offline"}
      onClick={onSaveNow}
      disabled={!onSaveNow}
      className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-accent disabled:hover:bg-transparent"
    >
      <Icon className={cn("size-[18px]", view.tone)} />
    </button>
  );
}
