"use client";

import React, { useState, useRef } from "react";
import FullScreenOverlay, {
  TabDefinition,
} from "@/components/official/FullScreenOverlay";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import type { HtmlPreviewState, HtmlPreviewActions } from "./types";
import TuiEditorContent, {
  type TuiEditorContentRef,
} from "@/components/mardown-display/chat-markdown/tui/TuiEditorContent";
import {
  MarkdownPlainTextTab,
  MarkdownPreviewTab,
  HtmlCodeFilesTab,
  CustomCopyTab,
  SavePageTab,
  MatrxSplitTab,
  MarkdownWysiwygTab,
  HtmlCodeTab,
  CompleteHtmlTab,
  EditHtmlTab,
} from "./tabs";

interface HtmlPreviewFullScreenEditorProps {
  isOpen: boolean;
  onClose: () => void;
  htmlPreviewState: HtmlPreviewState & HtmlPreviewActions;
  title?: string;
  description?: string;
  analysisData?: any;
  messageId?: string;
  onSave?: (markdownContent: string) => void;
  showSaveButton?: boolean;
}

/**
 * Complete HTML Preview Editor with Markdown editing
 * Integrates markdown editing tabs with HTML preview and management
 *
 * Tab Structure (11 tabs):
 * 1.  Split Editor     — TUI markdown editor with side-by-side preview (editMode="markdown")
 * 2.  WYSIWYG          — True rich-text editor (editMode="wysiwyg")
 * 3.  Plain Text       — Raw markdown textarea editor
 * 4.  Matrx Split      — Custom split view component
 * 5.  Preview          — Rendered markdown preview
 * 6.  HTML Files       — Multi-file source editor (content.html / wordpress.css / metadata.json / complete.html)
 * 7.  HTML Code        — Body-only HTML read-only textarea + copy buttons
 * 8.  Complete HTML    — Full document (with CSS) read-only textarea + copy
 * 9.  Edit HTML        — Monaco editor for the full HTML document
 * 10. Copy Options     — Custom copy helpers with formatting choices
 * 11. Publish          — Live preview + metadata editing + publish to html_pages
 */
export default function HtmlPreviewFullScreenEditor({
  isOpen,
  onClose,
  htmlPreviewState,
  title = "HTML Page Editor",
  description = "Edit markdown, preview and publish your HTML content",
  analysisData,
  messageId,
  onSave,
  showSaveButton = false,
}: HtmlPreviewFullScreenEditorProps) {
  const user = useAppSelector(selectUser);
  const [activeTab, setActiveTab] = useState<string>("markdown");
  const tuiEditorRef = useRef<TuiEditorContentRef>(null);

  // Handle tab change - sync content from TUI editor
  const handleTabChange = (newTab: string) => {
    // Get current content from TuiEditor if leaving the markdown (split) tab
    if (activeTab === "markdown" && tuiEditorRef.current?.getCurrentMarkdown) {
      const markdown = tuiEditorRef.current.getCurrentMarkdown();
      if (markdown !== htmlPreviewState.currentMarkdown) {
        htmlPreviewState.setCurrentMarkdown(markdown);
      }
    }
    setActiveTab(newTab);
  };

  // Handle save callback
  const handleSave = () => {
    if (onSave) {
      // Get final markdown from TUI editor if on wysiwyg tab
      let finalMarkdown = htmlPreviewState.currentMarkdown;
      if (
        activeTab === "markdown" &&
        tuiEditorRef.current?.getCurrentMarkdown
      ) {
        finalMarkdown = tuiEditorRef.current.getCurrentMarkdown();
      }
      onSave(finalMarkdown);
    }
  };

  // Define tabs for the FullScreenOverlay
  const tabDefinitions: TabDefinition[] = [
    // 1. Markdown split-view editor (TUI)
    {
      id: "markdown",
      label: "Split Editor",
      content: (
        <TuiEditorContent
          ref={tuiEditorRef}
          content={htmlPreviewState.currentMarkdown}
          onChange={(newContent) => {
            if (newContent) {
              htmlPreviewState.setCurrentMarkdown(newContent);
            }
          }}
          isActive={activeTab === "markdown"}
          editMode="markdown"
        />
      ),
      className: "overflow-hidden p-0 bg-background",
    },
    // 2. True WYSIWYG (rich-text, no source pane)
    {
      id: "wysiwyg",
      label: "WYSIWYG",
      content: (
        <MarkdownWysiwygTab
          state={htmlPreviewState}
          actions={htmlPreviewState}
          activeTab={activeTab}
        />
      ),
      className: "overflow-hidden p-0 bg-background",
    },
    // 3. Plain text / raw markdown editor
    {
      id: "write",
      label: "Plain Text",
      content: (
        <MarkdownPlainTextTab
          state={htmlPreviewState}
          actions={htmlPreviewState}
          analysisData={analysisData}
          messageId={messageId}
        />
      ),
      className: "p-0",
    },
    // 4. Matrx split (custom split preview)
    {
      id: "matrx-split",
      label: "Matrx Split",
      content: (
        <MatrxSplitTab state={htmlPreviewState} actions={htmlPreviewState} />
      ),
      className: "p-0 overflow-hidden",
    },
    // 5. Rendered markdown preview
    {
      id: "preview",
      label: "Preview",
      content: (
        <MarkdownPreviewTab
          state={htmlPreviewState}
          actions={htmlPreviewState}
          analysisData={analysisData}
          messageId={messageId}
        />
      ),
      className: "p-0",
    },
    // 6. Multi-file HTML/CSS/JSON source editor
    {
      id: "html-files",
      label: "HTML Files",
      content: (
        <HtmlCodeFilesTab
          state={htmlPreviewState}
          actions={htmlPreviewState}
          user={user}
        />
      ),
      className: "p-0 overflow-hidden",
    },
    // 7. Body-only HTML code view (read-only textarea with copy)
    {
      id: "html-code",
      label: "HTML Code",
      content: (
        <HtmlCodeTab state={htmlPreviewState} actions={htmlPreviewState} />
      ),
      className: "p-4",
    },
    // 8. Complete HTML file view (full document with embedded CSS)
    {
      id: "complete-html",
      label: "Complete HTML",
      content: (
        <CompleteHtmlTab state={htmlPreviewState} actions={htmlPreviewState} />
      ),
      className: "p-4",
    },
    // 9. Editable complete HTML (Monaco editor for full document)
    {
      id: "edit-html",
      label: "Edit HTML",
      content: (
        <EditHtmlTab state={htmlPreviewState} actions={htmlPreviewState} />
      ),
      className: "p-0 overflow-hidden",
    },
    // 10. Copy options with various formatting choices
    {
      id: "custom",
      label: "Copy Options",
      content: (
        <CustomCopyTab
          state={htmlPreviewState}
          actions={htmlPreviewState}
          user={user}
        />
      ),
      className: "p-4",
    },
    // 11. Publish tab
    {
      id: "save",
      label: "Publish",
      content: (
        <SavePageTab
          state={htmlPreviewState}
          actions={htmlPreviewState}
          user={user}
        />
      ),
      className: "p-4",
    },
  ];

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      tabs={tabDefinitions}
      initialTab={activeTab}
      onTabChange={handleTabChange}
      showSaveButton={showSaveButton}
      onSave={handleSave}
      showCancelButton={true}
      onCancel={onClose}
      hideTitle={true}
    />
  );
}
