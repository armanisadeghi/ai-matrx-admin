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
  /** Optional instance id so multiple captures can open concurrently. */
  instanceId?: string;
}

const OVERLAY_ID = "quickNoteSaveWindow";
const BASE_WINDOW_ID = "quick-note-save-window";

export default function QuickNoteSaveWindow({
  isOpen,
  onClose,
  initialContent = "",
  defaultFolder = "Scratch",
  instanceId,
}: QuickNoteSaveWindowProps) {
  if (!isOpen) return null;
  return (
    <QuickNoteSaveWindowInner
      onClose={onClose}
      initialContent={initialContent}
      defaultFolder={defaultFolder}
      instanceId={instanceId}
    />
  );
}

function QuickNoteSaveWindowInner({
  onClose,
  initialContent,
  defaultFolder,
  instanceId,
}: {
  onClose: () => void;
  initialContent: string;
  defaultFolder: string;
  instanceId?: string;
}) {
  const windowId = instanceId
    ? `${BASE_WINDOW_ID}-${instanceId}`
    : BASE_WINDOW_ID;

  const handleSaved = (_note: Note, action: PostSaveAction) => {
    if (action !== "none") onClose();
  };

  return (
    <WindowPanel
      title="Quick Save Note"
      id={windowId}
      overlayId={OVERLAY_ID}
      minWidth={520}
      minHeight={420}
      width={1080}
      height={760}
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
