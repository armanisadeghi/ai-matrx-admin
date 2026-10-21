"use client";

import { Button as ControlButton } from "@ai-matrx/design-system/controls";
import React, { useRef } from "react";
import { FileCode, CheckCircle2 } from "lucide-react";
import type { HtmlPreviewTabProps } from "../types";

export function WordPressCSSTab({ state, actions }: HtmlPreviewTabProps) {
    const cssTextareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSelectAllCSS = () => {
        if (cssTextareaRef.current) {
            cssTextareaRef.current.select();
            cssTextareaRef.current.setSelectionRange(0, 99999);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-3 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Copy this CSS to your WordPress theme to style the HTML content
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSelectAllCSS}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                        Select All
                    </button>
                    <ControlButton variant={state.copiedCSS ? "success" : "outline"} onClick={actions.handleCopyCSS} icon={state.copiedCSS ? <CheckCircle2 size={16} /> : <FileCode size={16} />}>{state.copiedCSS ? "Copied!" : "Copy CSS"}</ControlButton>
                </div>
            </div>
            <textarea
                ref={cssTextareaRef}
                value={state.wordPressCSS}
                readOnly
                className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-y-auto"
                placeholder="Loading CSS..."
            />
        </div>
    );
}

