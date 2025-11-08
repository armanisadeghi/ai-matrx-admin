import React from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PromptSettings } from "@/features/prompts/types/core";

interface ModelConfigurationProps {
    models: any[];
    model: string;
    onModelChange: (value: string) => void;
    modelConfig: PromptSettings;
    onSettingsClick: () => void;
    showSettingsDetails?: boolean; // Controls visibility of settings badges
}

export function ModelConfiguration({ models, model, onModelChange, modelConfig, onSettingsClick, showSettingsDetails = true }: ModelConfigurationProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Model</Label>
                    <Select value={model} onValueChange={onModelChange}>
                        <SelectTrigger className="h-8 bg-transparent text-gray-700 dark:text-gray-500 border-none hover:bg-gray-200 dark:hover:bg-gray-700 w-auto min-w-[180px] text-xs focus-none">
                            <SelectValue>
                                {models.find(m => m.id === model)?.common_name || model}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px]">
                            {models.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.common_name || m.id}
                                    {m.is_deprecated && <span className="text-xs text-gray-400 ml-2">(deprecated)</span>}
                                </SelectItem>
                            ))}
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

            {/* Settings details badges - conditionally shown */}
            {showSettingsDetails && (
            <div className="flex flex-wrap gap-1.5 text-xs">
                {/* Output Format */}
                {modelConfig.output_format && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        format: <span className="text-green-600 dark:text-green-400">{modelConfig.output_format}</span>
                    </span>
                )}
                
                {/* Temperature */}
                {modelConfig.temperature !== undefined && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        temp: <span className="text-green-600 dark:text-green-400">{modelConfig.temperature.toFixed(2)}</span>
                    </span>
                )}
                
                {/* Max Tokens */}
                {modelConfig.max_tokens !== undefined && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        tokens: <span className="text-green-600 dark:text-green-400">{modelConfig.max_tokens}</span>
                    </span>
                )}
                
                {/* Top P */}
                {modelConfig.top_p !== undefined && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        top_p: <span className="text-green-600 dark:text-green-400">{modelConfig.top_p.toFixed(2)}</span>
                    </span>
                )}
                
                {/* Top K */}
                {modelConfig.top_k !== undefined && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        top_k: <span className="text-green-600 dark:text-green-400">{modelConfig.top_k}</span>
                    </span>
                )}
                
                {/* Tool Choice */}
                {modelConfig.tool_choice && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        tool_choice: <span className="text-green-600 dark:text-green-400">{modelConfig.tool_choice}</span>
                    </span>
                )}
                
                {/* Reasoning Effort */}
                {modelConfig.reasoning_effort && modelConfig.reasoning_effort !== 'none' && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        reasoning: <span className="text-green-600 dark:text-green-400">{modelConfig.reasoning_effort}</span>
                    </span>
                )}
                
                {/* Verbosity */}
                {modelConfig.verbosity && modelConfig.verbosity !== 'none' && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        verbosity: <span className="text-green-600 dark:text-green-400">{modelConfig.verbosity}</span>
                    </span>
                )}
                
                {/* Summary */}
                {modelConfig.reasoning_summary && modelConfig.reasoning_summary !== 'none' && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        summary: <span className="text-green-600 dark:text-green-400">{modelConfig.reasoning_summary}</span>
                    </span>
                )}
                
                {/* Tools Array */}
                {modelConfig.tools && modelConfig.tools.length > 0 && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        tools: <span className="text-green-600 dark:text-green-400">{modelConfig.tools.length}</span>
                    </span>
                )}
                
                {/* Boolean Flags - Only show if true */}
                {modelConfig.store && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        store: <span className="text-green-600 dark:text-green-400">true</span>
                    </span>
                )}
                {modelConfig.stream && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        stream: <span className="text-green-600 dark:text-green-400">true</span>
                    </span>
                )}
                {modelConfig.parallel_tool_calls && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        parallel_tools: <span className="text-green-600 dark:text-green-400">true</span>
                    </span>
                )}
                {modelConfig.image_urls && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        images: <span className="text-green-600 dark:text-green-400">true</span>
                    </span>
                )}
                {modelConfig.file_urls && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        files: <span className="text-green-600 dark:text-green-400">true</span>
                    </span>
                )}
                {modelConfig.internal_web_search && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        web_search: <span className="text-green-600 dark:text-green-400">true</span>
                    </span>
                )}
                {modelConfig.youtube_videos && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-mono">
                        youtube: <span className="text-green-600 dark:text-green-400">true</span>
                    </span>
                )}
            </div>
            )}
        </div>
    );
}
