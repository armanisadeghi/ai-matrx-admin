"use client";

import React, { useMemo } from "react";
import MultiFileCodeEditor, { CodeFile } from "@/components/mardown-display/code/MultiFileCodeEditor";
import type { HtmlPreviewState, HtmlPreviewActions } from "../types";
import { getWordPressCSS } from "@/features/html-pages/css/wordpress-styles";

interface HtmlCodeFilesTabProps {
    state: HtmlPreviewState;
    actions: HtmlPreviewActions;
    user?: any;
}

/**
 * Multi-file code viewer and editor for HTML content
 * Consolidates HTML Code, WordPress CSS, Complete HTML, and HTML editing into one tab
 * 
 * File Structure:
 * - content.html: Body content only (extracted HTML) - READ ONLY
 * - wordpress.css: WordPress styling rules - READ ONLY
 * - complete.html: Full HTML document with embedded CSS - EDITABLE
 * 
 * Features:
 * - Monaco editor with syntax highlighting
 * - Auto-formatting on file switch
 * - File tree navigation with icons
 * - Edit complete.html directly in the viewer
 * - Replaces 4 old tabs: HtmlCodeTab, WordPressCSSTab, CompleteHtmlTab, EditHtmlTab
 */
export function HtmlCodeFilesTab({ state, actions }: HtmlCodeFilesTabProps) {
    // Get CSS directly from the source instead of waiting for async load
    const wordpressCSS = useMemo(() => {
        return state.wordPressCSS || getWordPressCSS();
    }, [state.wordPressCSS]);

    const files: CodeFile[] = useMemo(() => [
        {
            name: "content.html",
            path: "generated/content.html",
            language: "html",
            content: actions.extractBodyContent(actions.getCurrentHtmlContent()),
        },
        {
            name: "wordpress.css",
            path: "styles/wordpress.css",
            language: "css",
            content: wordpressCSS,
        },
        {
            name: "complete.html",
            path: "output/complete.html",
            language: "html",
            content: actions.getCurrentHtmlContent(),
        },
    ], [actions, wordpressCSS, state.generatedHtmlContent, state.editedCompleteHtml]);

    const handleChange = (path: string, content: string) => {
        // Only complete.html is editable
        if (path === "output/complete.html") {
            actions.setEditedCompleteHtml(content);
        }
    };

    return (
        <div className="h-full">
            <MultiFileCodeEditor
                files={files}
                onChange={handleChange}
                showSidebar={true}
                autoFormatOnOpen={true}
                defaultWordWrap="on"
                height="100%"
            />
        </div>
    );
}

