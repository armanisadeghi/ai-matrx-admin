"use client";

import React, { useRef } from "react";
import type { MarkdownTabProps } from "../types";
import TuiEditorContent, { type TuiEditorContentRef } from "@/components/mardown-display/chat-markdown/tui/TuiEditorContent";

export function MarkdownSplitViewTab({ state, actions, activeTab }: MarkdownTabProps) {
    const tuiEditorRef = useRef<TuiEditorContentRef>(null);

    return (
        <TuiEditorContent
            ref={tuiEditorRef}
            content={state.currentMarkdown}
            onChange={(newContent) => {
                if (newContent) {
                    actions.setCurrentMarkdown(newContent);
                }
            }}
            isActive={activeTab === "markdown"}
            editMode="markdown"
        />
    );
}

