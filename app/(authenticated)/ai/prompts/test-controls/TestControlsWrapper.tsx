"use client";

import { useState } from "react";
import { ModelConfiguration } from "./ModelConfiguration";
import ModelSettingsDialog from "./ModelSettingsDialog";
import { useModelControls } from "@/features/prompts/hooks/useModelControls";
import { AiModelsPreferences } from "@/lib/redux/slices/userPreferencesSlice";
import { RootState, useAppSelector } from "@/lib/redux";

interface ModelConfig {
    output_format?: string;
    tool_choice?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    top_k?: number;
    store?: boolean;
    stream?: boolean;
    parallel_tool_calls?: boolean;
    tools?: boolean;
    image_urls?: boolean;
    file_urls?: boolean;
    internal_web_search?: boolean;
    youtube_videos?: boolean;
    reasoning_effort?: string;
    verbosity?: string;
    reasoning_summary?: string;
}

interface TestControlsWrapperProps {
    models: any[];
}

export function TestControlsWrapper({ models }: TestControlsWrapperProps) {
    const modelPreferences = useAppSelector((state: RootState) => state.userPreferences.aiModels as AiModelsPreferences);

    const [selectedModelId, setSelectedModelId] = useState(modelPreferences.defaultModel || models[0]?.id || '');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [modelConfig, setModelConfig] = useState<ModelConfig>({
        output_format: "text",
        tool_choice: "auto",
        temperature: 0.5,
        max_tokens: 16000,
        store: false,
        stream: true,
        tools: false,
        parallel_tool_calls: false,
        image_urls: false,
        file_urls: false,
        internal_web_search: false,
        youtube_videos: false,
        reasoning_effort: "none",
        verbosity: "none",
        reasoning_summary: "none",
    });

    const { normalizedControls } = useModelControls(models, selectedModelId);

    // Don't auto-update settings when model changes - preserve existing settings
    // This allows users to switch models without losing their configured settings
    const handleModelChange = (modelId: string) => {
        setSelectedModelId(modelId);
        // Note: We don't update modelConfig here to preserve user's settings
        // Use getModelDefaults() if you want to reset to model defaults
    };

    return (
        <div className="p-6 space-y-6">
            {/* Actual UI Components */}
            <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Actual Prompt Builder Components
                </h2>
                <ModelConfiguration
                    model={selectedModelId}
                    models={models}
                    onModelChange={handleModelChange}
                    modelConfig={modelConfig}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                />
            </div>

            {/* Current Settings */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Current Settings (State)
                </h2>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <pre className="p-4 overflow-auto text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                        {JSON.stringify(modelConfig, null, 2)}
                    </pre>
                </div>
            </div>

            {/* Unmapped Controls - Need Attention */}
            {normalizedControls && Object.keys(normalizedControls.unmappedControls || {}).length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 dark:border-yellow-600 rounded-lg p-4">
                    <h2 className="text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-2">
                        ⚠️ Unmapped Controls ({Object.keys(normalizedControls.unmappedControls).length})
                    </h2>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                        These controls are not being handled. Add to hook or update database.
                    </p>
                    <div className="rounded bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 overflow-hidden">
                        <pre className="p-3 overflow-auto text-xs text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap break-words max-h-[300px]">
                            {JSON.stringify(normalizedControls.unmappedControls, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {/* Normalized Controls for Debugging */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Parsed Controls (From Hook)
                </h2>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <pre className="p-4 overflow-auto text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words max-h-[400px]">
                        {JSON.stringify(normalizedControls, null, 2)}
                    </pre>
                </div>
            </div>

            {/* Model Settings Dialog */}
            <ModelSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                modelId={selectedModelId}
                models={models}
                settings={modelConfig}
                onSettingsChange={setModelConfig}
            />
        </div>
    );
}

