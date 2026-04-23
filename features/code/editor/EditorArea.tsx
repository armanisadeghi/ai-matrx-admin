"use client";

import React, { useCallback } from "react";
import { FileCode } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { selectActiveTab, updateTabContent } from "../redux";
import { EDITOR_BG } from "../styles/tokens";
import { EditorTabs } from "./EditorTabs";
import { EditorToolbar } from "./EditorToolbar";
import { MonacoEditor } from "./MonacoEditor";

interface EditorAreaProps {
  rightSlotAvailable?: boolean;
  farRightSlotAvailable?: boolean;
  className?: string;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  rightSlotAvailable = false,
  farRightSlotAvailable = false,
  className,
}) => {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);

  const handleChange = useCallback(
    (next: string) => {
      if (!activeTab) return;
      dispatch(updateTabContent({ id: activeTab.id, content: next }));
    },
    [dispatch, activeTab],
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col", EDITOR_BG, className)}>
      <div className="flex h-9 shrink-0 items-stretch border-b border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="min-w-0 flex-1 overflow-hidden">
          <EditorTabs />
        </div>
        <EditorToolbar
          rightSlotAvailable={rightSlotAvailable}
          farRightSlotAvailable={farRightSlotAvailable}
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
