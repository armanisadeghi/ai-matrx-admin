
"use client";
import React from "react";
import { CheckCircleIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type RecipeInfo = {
    id: string;
    name: string;
    description?: string;
    version: number;
    status: string;
    post_result_options?: Record<string, unknown>;
    tags?: {
        tags: string[];
    }
};
interface ExtendedRecipeInfo extends Omit<RecipeInfo, "tags"> {
    tags?: string[];
    originalTags?: { tags: string[] };
}
// Props for the VersionSelector component
interface VersionSelectorProps {
    filteredRecipes: ExtendedRecipeInfo[];
    selectedRecipe: string | null;
    versionSelection: "latest" | "specific";
    specificVersion: number;
    isVersionValid: boolean;
    isCheckingVersion: boolean;
    onVersionSelectionChange: (value: "latest" | "specific") => void;
    onSpecificVersionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}


export const VersionSelector: React.FC<VersionSelectorProps> = ({
    filteredRecipes,
    selectedRecipe,
    versionSelection,
    specificVersion,
    isVersionValid,
    isCheckingVersion,
    onVersionSelectionChange,
    onSpecificVersionChange,
}) => {
    if (!selectedRecipe) return null;
    
    return (
        <div className="w-full mt-4 p-3 border-border rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Version Selection</h3>
            <RadioGroup
                value={versionSelection}
                onValueChange={(v) => onVersionSelectionChange(v as "latest" | "specific")}
                className="space-y-2 mt-2"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="latest" id="latest" />
                    <Label htmlFor="latest" className="text-gray-900 dark:text-gray-100">
                        Latest Version
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific" className="text-gray-900 dark:text-gray-100">
                        Specific Version
                    </Label>
                </div>
            </RadioGroup>
            {versionSelection === "specific" && (
                <div className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2">
                        <Input
                            type="number"
                            min="1"
                            value={specificVersion}
                            onChange={onSpecificVersionChange}
                            className={`w-20 border-gray-200 dark:border-gray-700 bg-textured ${
                                !isVersionValid ? "border-red-300 dark:border-red-700" : ""
                            }`}
                        />
                        {isCheckingVersion ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Checking...</span>
                        ) : isVersionValid ? (
                            <span className="flex items-center text-xs text-green-500 dark:text-green-400">
                                <CheckCircleIcon className="h-3 w-3" /> Version exists
                            </span>
                        ) : (
                            <span className="text-xs text-red-500 dark:text-red-400">Version not found</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Enter a version number to use (current version is {specificVersion})
                    </p>
                </div>
            )}
        </div>
    );
};

export default VersionSelector;