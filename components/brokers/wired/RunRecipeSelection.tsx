"use client";

import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuickRefSelect from "@/app/entities/quick-reference/QuickRefSelectFloatingLabel";
import { useRunRecipeVersionSelection } from "@/hooks/run-recipe/useRunRecipeVersionSelection";
import { CompiledRecipeRecordWithKey } from "@/types";

type RunRecipeSelectionProps = {
    onStateChange?: (state: { 
        recipe: QuickReferenceRecord | undefined; 
        version: number;
        compiledVersions: CompiledRecipeRecordWithKey[];
    }) => void;
    className?: string;
}
  
export function RunRecipeSelection({ onStateChange, className = "" }: RunRecipeSelectionProps) {
    const { 
        selectedRecipe, 
        selectedVersion, 
        sortedVersions, 
        handleRecipeChange, 
        handleVersionChange 
    } = useRunRecipeVersionSelection({
        onStateChange
    });

    const handleSelectChange = (value: string) => {
        handleVersionChange(Number(value));
    };

    return (
        <div className={`flex items-center gap-4 p-2 ${className}`}>
            <div>
                <QuickRefSelect 
                    entityKey="recipe" 
                    fetchMode="fkIfk" 
                    onRecordChange={handleRecipeChange} 
                />
            </div>
            <div>
                <Select
                    value={selectedVersion.toString()}
                    onValueChange={handleSelectChange}
                    disabled={!selectedRecipe || sortedVersions.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Available Versions</SelectLabel>
                            {sortedVersions.map((version) => (
                                <SelectItem 
                                    key={version.version} 
                                    value={version.version.toString()}
                                >
                                    Version {version.version}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

export default RunRecipeSelection;