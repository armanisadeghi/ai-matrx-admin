"use client";

import React from "react";
import MarkdownStream from "@/components/Markdown";
import type { MarkdownTabProps } from "../types";

export function MarkdownPreviewTab({ state, analysisData, messageId }: MarkdownTabProps) {
    return (
        <div className="w-full h-full overflow-auto bg-background dark:bg-background">
            <div className="flex justify-center min-h-full">
                <div className="max-w-[750px] w-full p-6 border-x-3 border-gray-500 dark:border-gray-500 shadow-sm min-h-full">
                    <MarkdownStream
                        content={state.currentMarkdown}
                        type="message"
                        role="assistant"
                        className="bg-transparent dark:bg-transparent p-4"
                        isStreamActive={false}
                        analysisData={analysisData}
                        messageId={messageId}
                        allowFullScreenEditor={false}
                    />
                </div>
            </div>
        </div>
    );
}

