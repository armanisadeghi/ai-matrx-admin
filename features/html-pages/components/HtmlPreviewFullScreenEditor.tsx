"use client";

import React, { useState, useRef } from "react";
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import type { HtmlPreviewState, HtmlPreviewActions } from "./types";
import TuiEditorContent, { type TuiEditorContentRef } from "@/components/mardown-display/chat-markdown/tui/TuiEditorContent";
import {
    MarkdownPlainTextTab,
    MarkdownPreviewTab,
    HtmlCodeFilesTab,
    CustomCopyTab,
    SavePageTab
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
 * Tab Structure (6 tabs):
 * 1. Rich Text Editor (WYSIWYG)
 * 2. Plain Text Editor
 * 3. Markdown Preview
 * 4. HTML Files (Multi-file viewer/editor for HTML/CSS/Complete - editable complete.html)
 * 5. Custom Copy Options
 * 6. Publish (Live preview + metadata editing - uses auto-generated preview URL)
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
    showSaveButton = false
}: HtmlPreviewFullScreenEditorProps) {
    const user = useAppSelector(selectUser);
    const [activeTab, setActiveTab] = useState<string>("wysiwyg");
    const tuiEditorRef = useRef<TuiEditorContentRef>(null);

    // Handle tab change - sync content from TUI editor
    const handleTabChange = (newTab: string) => {
        // Get current content from TuiEditor if leaving wysiwyg tab
        if (activeTab === "wysiwyg" && tuiEditorRef.current?.getCurrentMarkdown) {
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
            if (activeTab === "wysiwyg" && tuiEditorRef.current?.getCurrentMarkdown) {
                finalMarkdown = tuiEditorRef.current.getCurrentMarkdown();
            }
            onSave(finalMarkdown);
        }
    };

    // Define tabs for the FullScreenOverlay
    const tabDefinitions: TabDefinition[] = [
        // Rich Text Editor (WYSIWYG)
        {
            id: "markdown",
            label: "Rich Text Editor",
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
            className: "overflow-hidden p-0 bg-background"
        },
        {
            id: "write",
            label: "Plain Text Editor",
            content: (
                <MarkdownPlainTextTab
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    analysisData={analysisData}
                    messageId={messageId}
                />
            ),
            className: "p-0"
        },
        {
            id: "preview",
            label: "Matrx Preview",
            content: (
                <MarkdownPreviewTab
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    analysisData={analysisData}
                    messageId={messageId}
                />
            ),
            className: "p-0"
        },
        // HTML code files viewer/editor
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
            className: "p-0 overflow-hidden"
        },
        {
            id: "custom",
            label: "Custom Copy",
            content: (
                <CustomCopyTab
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    user={user}
                />
            ),
            className: "p-4"
        },
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
            className: "p-4"
        }
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
        />
    );
}

