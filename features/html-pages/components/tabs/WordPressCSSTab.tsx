"use client";

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
                    <button
                        onClick={actions.handleCopyCSS}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                            state.copiedCSS
                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                : "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                        }`}
                    >
                        {state.copiedCSS ? (
                            <>
                                <CheckCircle2 size={16} />
                                Copied!
                            </>
                        ) : (
                            <>
                                <FileCode size={16} />
                                Copy CSS
                            </>
                        )}
                    </button>
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

