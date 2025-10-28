import React from "react";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatText } from "@/utils/text/text-case-converter";
import { mapIcon } from "@/utils/icons/icon-mapper";

interface ToolsManagerProps {
    selectedTools: string[];
    availableTools: any[]; // Array of database tool objects
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
    // Create a map for quick lookup of tool display data (name and icon)
    const toolDisplayMap = availableTools?.reduce((acc, tool) => {
        acc[tool.name] = {
            displayName: formatText(tool.name),
            icon: mapIcon(tool.icon, tool.category, 16)
        };
        return acc;
    }, {} as Record<string, { displayName: string; icon: React.ReactNode }>) || {};

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Label className={`text-xs ${modelSupportsTools ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                Tools
                {!modelSupportsTools && <span className="text-[10px] ml-1 opacity-60">(N/A)</span>}
            </Label>
            {selectedTools.map((toolName) => {
                const toolData = toolDisplayMap[toolName];
                return (
                    <span
                        key={toolName}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                            modelSupportsTools
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        {toolData?.icon && (
                            <span className="flex-shrink-0">
                                {toolData.icon}
                            </span>
                        )}
                        <span className="truncate">
                            {toolData?.displayName || toolName}
                        </span>
                        {modelSupportsTools && (
                            <X
                                className="w-3 h-3 cursor-pointer hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 ml-1"
                                onClick={() => onRemoveTool(toolName)}
                            />
                        )}
                    </span>
                );
            })}
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
                <PopoverContent className="w-80 p-3" align="start" sideOffset={4}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Available Tools
                            </Label>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {availableTools.filter((tool) => !selectedTools.includes(tool.name)).length} available
                            </span>
                        </div>
                        <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {availableTools
                                .filter((tool) => !selectedTools.includes(tool.name))
                                .map((tool) => {
                                    const displayName = formatText(tool.name);
                                    const icon = mapIcon(tool.icon, tool.category, 16);
                                    return (
                                        <button
                                            key={tool.name}
                                            onClick={() => onAddTool(tool.name)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                        >
                                            <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                                                {icon}
                                            </span>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {displayName}
                                                </div>
                                                {tool.description && (
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                        {tool.description}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full font-mono flex-shrink-0">
                                                {tool.category?.toLowerCase() || 'tool'}
                                            </span>
                                        </button>
                                    );
                                })}
                        </div>
                        {availableTools.filter((tool) => !selectedTools.includes(tool.name)).length === 0 && (
                            <div className="text-center py-8">
                                <div className="text-gray-400 dark:text-gray-500 mb-2">
                                    <Plus className="w-8 h-8 mx-auto opacity-50" />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    All tools have been added
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                    Remove some tools to add different ones
                                </p>
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

