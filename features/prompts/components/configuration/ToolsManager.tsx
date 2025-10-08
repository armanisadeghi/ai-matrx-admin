import React from "react";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ToolsManagerProps {
    selectedTools: string[];
    availableTools: string[];
    isAddingTool: boolean;
    onIsAddingToolChange: (value: boolean) => void;
    onAddTool: (tool: string) => void;
    onRemoveTool: (tool: string) => void;
    modelSupportsTools: boolean;
}

export function ToolsManager({
    selectedTools,
    availableTools,
    isAddingTool,
    onIsAddingToolChange,
    onAddTool,
    onRemoveTool,
    modelSupportsTools,
}: ToolsManagerProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Label className={`text-xs ${modelSupportsTools ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                Tools
                {!modelSupportsTools && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
            </Label>
            {selectedTools.map((tool) => (
                <span
                    key={tool}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                        modelSupportsTools
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                    }`}
                >
                    {tool}
                    {modelSupportsTools && (
                        <X
                            className="w-3 h-3 cursor-pointer hover:text-red-500 dark:hover:text-red-400"
                            onClick={() => onRemoveTool(tool)}
                        />
                    )}
                </span>
            ))}
            <Popover open={isAddingTool} onOpenChange={modelSupportsTools ? onIsAddingToolChange : undefined}>
                <PopoverTrigger asChild>
                    <button
                        disabled={!modelSupportsTools}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                            modelSupportsTools
                                ? 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
                                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                        }`}
                        onClick={() => modelSupportsTools && onIsAddingToolChange(true)}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Select a tool</Label>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {availableTools
                                .filter((tool) => !selectedTools.includes(tool))
                                .map((tool) => (
                                    <button
                                        key={tool}
                                        onClick={() => onAddTool(tool)}
                                        className="w-full text-left px-3 py-2 text-xs text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                    >
                                        {tool}
                                    </button>
                                ))}
                        </div>
                        {availableTools.filter((tool) => !selectedTools.includes(tool)).length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                                All tools have been added
                            </p>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

