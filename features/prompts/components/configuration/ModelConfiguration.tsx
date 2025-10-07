import React from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelConfig {
    textFormat: string;
    toolChoice: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    storeLogs: boolean;
    reasoningEffort?: string;
    verbosity?: string;
    summary?: string;
}

interface ModelConfigurationProps {
    model: string;
    onModelChange: (value: string) => void;
    modelConfig: ModelConfig;
    onSettingsClick: () => void;
}

export function ModelConfiguration({
    model,
    onModelChange,
    modelConfig,
    onSettingsClick,
}: ModelConfigurationProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Model</Label>
                    <Select value={model} onValueChange={onModelChange}>
                        <SelectTrigger className="h-8 bg-transparent text-gray-700 dark:text-gray-500 border-none hover:bg-gray-200 dark:hover:bg-gray-700 w-auto min-w-[180px] text-xs focus-none">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                            <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                            <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                            <SelectItem value="claude-3-5-sonnet-20241022">claude-3.5-sonnet</SelectItem>
                            <SelectItem value="claude-3-opus-20240229">claude-3-opus</SelectItem>
                            <SelectItem value="claude-3-haiku-20240307">claude-3-haiku</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={onSettingsClick}
                >
                    <Settings2 className="w-3.5 h-3.5 mr-1" />
                </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                    text_format: <span className="text-green-600 dark:text-green-400">{modelConfig.textFormat}</span>
                </span>
                {modelConfig.temperature !== undefined && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        temp:{" "}
                        <span className="text-green-600 dark:text-green-400">{modelConfig.temperature.toFixed(2)}</span>
                    </span>
                )}
                {modelConfig.maxTokens !== undefined && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        tokens: <span className="text-green-600 dark:text-green-400">{modelConfig.maxTokens}</span>
                    </span>
                )}
                {modelConfig.topP !== undefined && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        top_p: <span className="text-green-600 dark:text-green-400">{modelConfig.topP.toFixed(2)}</span>
                    </span>
                )}
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                    store: <span className="text-green-600 dark:text-green-400">{modelConfig.storeLogs.toString()}</span>
                </span>
            </div>
        </div>
    );
}

