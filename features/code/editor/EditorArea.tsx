"use client";

import React, { useCallback, useEffect } from "react";
import { FileCode } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { codeFilesActions } from "@/features/code-files";
import { selectActiveTab, updateTabContent } from "../redux";
import { AVATAR_RESERVE, EDITOR_BG } from "../styles/tokens";
import {
  codeFileIdFromTabId,
  isLibraryTabId,
} from "../hooks/useOpenLibraryFile";
import { useSaveActiveTab } from "../hooks/useSaveActiveTab";
import { EditorTabs } from "./EditorTabs";
import { EditorToolbar } from "./EditorToolbar";
import { MonacoEditor } from "./MonacoEditor";

interface EditorAreaProps {
  rightSlotAvailable?: boolean;
  farRightSlotAvailable?: boolean;
  /** When true, the editor is the rightmost column and its toolbar needs to
   *  reserve space for the app's floating avatar. */
  rightmost?: boolean;
  className?: string;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  rightSlotAvailable = false,
  farRightSlotAvailable = false,
  rightmost = false,
  className,
}) => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);
  const saveActiveTab = useSaveActiveTab();

  const handleChange = useCallback(
    (next: string) => {
      if (!activeTab) return;
      dispatch(updateTabContent({ id: activeTab.id, content: next }));
      // Mirror edits of library tabs into the code-files slice so its own
      // dirty-tracking + auto-save machinery stays in sync with Monaco.
      if (isLibraryTabId(activeTab.id)) {
        const codeFileId = codeFileIdFromTabId(activeTab.id);
        if (codeFileId) {
          dispatch(
            codeFilesActions.setLocalContent({ id: codeFileId, content: next }),
          );
        }
      }
    },
    [dispatch, activeTab],
  );

  const handleSave = useCallback(() => {
    void saveActiveTab().then((result) => {
      if (result && !result.ok) {
        console.error("[EditorArea] save failed", result.error);
      }
    });
  }, [saveActiveTab]);

  // Fallback save shortcut for when focus is in the editor area but not
  // inside Monaco itself (e.g. on the tab strip). Mirrors Cmd/Ctrl+S.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S")) {
        // Only intercept when there's actually something to save.
        if (!activeTab) return;
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, handleSave]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", EDITOR_BG, className)}>
      <div
        className={cn(
          "flex h-9 shrink-0 items-stretch border-b border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900",
          rightmost && AVATAR_RESERVE,
        )}
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <EditorTabs />
        </div>
        <EditorToolbar
          rightSlotAvailable={rightSlotAvailable}
          farRightSlotAvailable={farRightSlotAvailable}
          onSaveActiveTab={handleSave}
          hasDirtyActiveTab={Boolean(activeTab?.dirty)}
          hasActiveTab={Boolean(activeTab)}
        />
      </div>
      <div className="relative flex-1 min-h-0">
        {activeTab ? (
          <MonacoEditor
            key={activeTab.id}
            value={activeTab.content}
            language={activeTab.language}
            path={activeTab.path}
            onChange={handleChange}
            onSave={handleSave}
          />
        ) : (
          <EmptyEditorState />
        )}
      </div>
    </div>
  );
};

const EmptyEditorState: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-neutral-400 dark:text-neutral-600">
      <FileCode size={40} strokeWidth={1.2} />
      <p className="text-sm">
        Select a file from the explorer to start editing.
      </p>
    </div>
  </div>
);
