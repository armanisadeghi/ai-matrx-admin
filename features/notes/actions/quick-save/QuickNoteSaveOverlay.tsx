"use client";

import type { Note } from "@/features/notes/types";
import { QuickNoteSaveCore, type PostSaveAction } from "./QuickNoteSaveCore";
import FullScreenOverlay from "@/components/official/FullScreenOverlay";

export interface QuickNoteSaveOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  defaultFolder?: string;
  title?: string;
  onSaved?: (note?: Note, action?: PostSaveAction) => void;
}

export function QuickNoteSaveOverlay({
  isOpen,
  onClose,
  initialContent,
  defaultFolder = "Scratch",
  title = "Quick Save",
  onSaved,
}: QuickNoteSaveOverlayProps) {
  const handleSaved = (note: Note, action: PostSaveAction) => {
    onSaved?.(note, action);
    onClose();
  };

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      compactTabs
      tabs={[
        {
          id: "editor",
          label: "Editor",
          content: (
            <div className="h-full min-h-0 p-3">
              <QuickNoteSaveCore
                initialContent={initialContent}
                defaultFolder={defaultFolder}
                initialEditorMode="split"
                onSaved={handleSaved}
                onCancel={onClose}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
