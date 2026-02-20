"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelSettings } from "./ModelSettings";

interface ModelSettingsType {
    /** @deprecated Use response_format */
    output_format?: string;
    response_format?: { type: string; [key: string]: unknown };
    tool_choice?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    top_k?: number;
    thinking_budget?: number;
    store?: boolean;
    stream?: boolean;
    parallel_tool_calls?: boolean;
    include_thoughts?: boolean;
    tools?: string[]; // Array of selected tool names
    image_urls?: boolean;
    file_urls?: boolean;
    internal_web_search?: boolean;
    internal_url_context?: boolean;
    youtube_videos?: boolean;
    reasoning_effort?: string;
    verbosity?: string;
    reasoning_summary?: string;
}

interface ModelSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    modelId: string;
    models: any[];
    settings: ModelSettingsType;
    onSettingsChange: (settings: ModelSettingsType) => void;
    availableTools?: any[]; // Array of database tool objects
}

export function ModelSettingsDialog({
    isOpen,
    onClose,
    modelId,
    models,
    settings,
    onSettingsChange,
    availableTools = [],
}: ModelSettingsDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
            <div 
                className="bg-textured rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                    <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 tracking-wide uppercase">
                        Model Settings
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={onClose}
                    >
                        <X className="w-3 h-3" />
                    </Button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto px-4 py-3">
                    <ModelSettings
                        modelId={modelId}
                        models={models}
                        settings={settings}
                        onSettingsChange={onSettingsChange}
                        availableTools={availableTools}
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border bg-gray-50 dark:bg-gray-900/50">
                    <Button variant="ghost" onClick={onClose} size="sm" className="h-7 text-xs">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

