"use client";

import { Button as ControlButton } from "@ai-matrx/design-system/controls";
import React, { useRef } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import type { HtmlPreviewTabProps } from "../types";

export function HtmlCodeTab({ state, actions }: HtmlPreviewTabProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSelectAll = () => {
        if (textareaRef.current) {
            textareaRef.current.select();
            textareaRef.current.setSelectionRange(0, 99999);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-3 flex gap-2 flex-wrap">
                <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                >
                    Select All
                </button>
                <ControlButton variant={state.copied ? "success" : "outline"} onClick={actions.handleCopyHtml} icon={state.copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}>{state.copied ? "Copied!" : "Copy HTML"}</ControlButton>
                <ControlButton variant={state.copiedNoBullets ? "success" : "outline"} onClick={actions.handleCopyHtmlNoBullets} icon={state.copiedNoBullets ? <CheckCircle2 size={16} /> : <Copy size={16} />}>{state.copiedNoBullets ? "Copied!" : "Copy HTML No Bullet Styles"}</ControlButton>
            </div>
            <textarea
                ref={textareaRef}
                value={state.contentHtml}
                readOnly
                className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-y-auto"
            />
        </div>
    );
}

