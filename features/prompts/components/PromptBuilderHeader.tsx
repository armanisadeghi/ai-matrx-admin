import React from "react";
import { GitCompare, Sparkles, BarChart, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptBuilderHeaderProps {
    promptName: string;
    onPromptNameChange: (value: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
}

export function PromptBuilderHeader({
    promptName,
    onPromptNameChange,
    isDirty,
    isSaving,
    onSave,
}: PromptBuilderHeaderProps) {
    return (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={promptName}
                        onChange={(e) => onPromptNameChange(e.target.value)}
                        className="text-lg font-semibold bg-transparent border-none outline-none w-64 text-gray-900 dark:text-gray-100 px-0 py-1"
                    />
                    <span className="px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        Draft
                    </span>
                    {isDirty && (
                        <span className="px-2 py-0.5 text-xs border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded">
                            Unsaved changes
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                        <GitCompare className="w-4 h-4 mr-2" />
                        Compare
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Optimize
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                        <BarChart className="w-4 h-4 mr-2" />
                        Evaluate
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}

