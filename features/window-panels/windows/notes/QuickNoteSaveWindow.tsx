"use client";

import React from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import {
  QuickNoteSaveCore,
  type PostSaveAction,
} from "@/features/notes/actions/quick-save/QuickNoteSaveCore";
import type { Note } from "@/features/notes/types";

export interface QuickNoteSaveWindowProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
  defaultFolder?: string;
}

const OVERLAY_ID = "quickNoteSaveWindow";
const WINDOW_ID = "quick-note-save-window";

export default function QuickNoteSaveWindow({
  isOpen,
  onClose,
  initialContent = "",
  defaultFolder = "Scratch",
}: QuickNoteSaveWindowProps) {
  if (!isOpen) return null;
  return (
    <QuickNoteSaveWindowInner
      onClose={onClose}
      initialContent={initialContent}
      defaultFolder={defaultFolder}
    />
  );
}

function QuickNoteSaveWindowInner({
  onClose,
  initialContent,
  defaultFolder,
}: {
  onClose: () => void;
  initialContent: string;
  defaultFolder: string;
}) {
  const handleSaved = (_note: Note, action: PostSaveAction) => {
    if (action !== "none") {
      // User chose an action that navigates or spawns — close this window.
      onClose();
    }
  };

  return (
    <WindowPanel
      title="Quick Save Note"
      id={WINDOW_ID}
      overlayId={OVERLAY_ID}
      minWidth={420}
      minHeight={360}
      width={640}
      height={540}
      position="center"
      onClose={onClose}
    >
      <div className="h-full min-h-0 p-3">
        <QuickNoteSaveCore
          initialContent={initialContent}
          defaultFolder={defaultFolder}
          onSaved={handleSaved}
          onCancel={onClose}
        />
      </div>
    </WindowPanel>
  );
}
