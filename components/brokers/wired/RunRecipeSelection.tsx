"use client";

import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuickRefSelect from "@/app/entities/quick-reference/QuickRefSelectFloatingLabel";
import { useRunRecipeVersionSelection } from "@/hooks/run-recipe/useRunRecipeVersionSelection";
import { CompiledRecipeRecordWithKey } from "@/types";
import { Cover } from "@/components/ui/cover";
import { Label } from "@/components/ui";

export function RunRecipeSelectionTitle() {
    return (
        <div>
            <h1 className="text-2xl font-semibold max-w-7xl mx-auto text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-800 via-neutral-700 to-neutral-700 dark:from-neutral-800 dark:via-white dark:to-white">
                Admin <Cover>Recipe</Cover> Tester
            </h1>
        </div>
    );
}

type RunRecipeSelectionProps = {
    onStateChange?: (state: {
        recipe: QuickReferenceRecord | undefined;
        version: number;
        compiledVersions: CompiledRecipeRecordWithKey[];
    }) => void;
    className?: string;
    columns?: number;
    onColumnsChange?: (columns: number) => void;
};

export function RunRecipeSelection({ onStateChange, className = "", onColumnsChange, columns = 1 }: RunRecipeSelectionProps) {
    const { selectedRecipe, selectedVersion, sortedVersions, handleRecipeChange, handleVersionChange } = useRunRecipeVersionSelection({
        onStateChange,
    });

    const handleSelectChange = (value: string) => {
        handleVersionChange(Number(value));
    };

    const handleColumnsChange = (value: string) => {
        onColumnsChange?.(Number(value));
    };

    return (
        <div className={`flex items-center space-x-8 p-4 ${className}`}>
            <div className="flex-none">
                <RunRecipeSelectionTitle />
            </div>

            <div className="flex-none w-64">
                <QuickRefSelect entityKey="recipe" fetchMode="fkIfk" onRecordChange={handleRecipeChange} />
            </div>

            {selectedRecipe && (
                <>
                    <div className="flex-none w-48">
                        <Select
                            value={selectedVersion.toString()}
                            onValueChange={handleSelectChange}
                            disabled={!selectedRecipe || sortedVersions.length === 0}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Available Versions</SelectLabel>
                                    {sortedVersions.map((version) => (
                                        <SelectItem key={version.version} value={version.version.toString()}>
                                            Version {version.version}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label>Number of Columns:</Label>
                        <Select value={columns.toString()} onValueChange={handleColumnsChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select columns" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}
        </div>
    );
}

export default RunRecipeSelection;
