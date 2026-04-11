"use client";

import React from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import MarkdownClassificationTester from "@/components/mardown-display/markdown-classification/MarkdownClassificationTester";

interface MarkdownEditorWindowProps {
  isOpen: boolean;
  onClose?: () => void;
  initialMarkdown?: string;
  showSampleSelector?: boolean;
  showConfigSelector?: boolean;
}

export default function MarkdownEditorWindow({
  isOpen,
  onClose,
  initialMarkdown,
  showSampleSelector = true,
  showConfigSelector = true,
}: MarkdownEditorWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Markdown Editor"
      width={1000}
      height={700}
      urlSyncKey="markdown_editor"
      onClose={onClose}
      overlayId="markdownEditorWindow"
    >
      <div className="flex-1 overflow-hidden h-full">
        <MarkdownClassificationTester
          initialMarkdown={initialMarkdown}
          showSelectors={showSampleSelector && showConfigSelector}
        />
      </div>
    </WindowPanel>
  );
}
