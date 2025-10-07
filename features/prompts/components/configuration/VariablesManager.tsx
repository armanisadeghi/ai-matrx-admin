import React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface VariablesManagerProps {
    variables: string[];
    newVariableName: string;
    onNewVariableNameChange: (value: string) => void;
    isAddingVariable: boolean;
    onIsAddingVariableChange: (value: boolean) => void;
    onAddVariable: () => void;
    onRemoveVariable: (variable: string) => void;
}

export function VariablesManager({
    variables,
    newVariableName,
    onNewVariableNameChange,
    isAddingVariable,
    onIsAddingVariableChange,
    onAddVariable,
    onRemoveVariable,
}: VariablesManagerProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-gray-600 dark:text-gray-400">Variables</Label>
            {variables.map((variable) => (
                <span
                    key={variable}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-700"
                >
                    {variable}
                    <X
                        className="w-3 h-3 cursor-pointer hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => onRemoveVariable(variable)}
                    />
                </span>
            ))}
            <Popover open={isAddingVariable} onOpenChange={onIsAddingVariableChange}>
                <PopoverTrigger asChild>
                    <button
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        onClick={() => onIsAddingVariableChange(true)}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Variable name</Label>
                        <input
                            type="text"
                            placeholder="e.g. city"
                            value={newVariableName}
                            onChange={(e) => onNewVariableNameChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    onAddVariable();
                                } else if (e.key === "Escape") {
                                    onIsAddingVariableChange(false);
                                    onNewVariableNameChange("");
                                }
                            }}
                            autoFocus
                            className="w-full px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Only lowercase letters, numbers, and underscores
                        </p>
                        <Button size="sm" onClick={onAddVariable} className="w-full">
                            Add
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

