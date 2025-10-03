"use client";

import React from "react";
import type { MarkdownTabProps } from "../types";

export function MarkdownPlainTextTab({ state, actions }: MarkdownTabProps) {
    return (
        <textarea
            className="w-full h-full p-4 outline-none resize-none border-none bg-background text-foreground text-base font-mono"
            value={state.currentMarkdown}
            onChange={(e) => actions.setCurrentMarkdown(e.target.value)}
            placeholder="Start writing markdown..."
            aria-label="Markdown Editor"
        />
    );
}

