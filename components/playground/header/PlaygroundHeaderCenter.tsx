"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/ButtonMine";
import { Plus, History, Save, Settings } from "lucide-react";
import PlaygroundHistoryDialog from "./PlaygroundHistoryDialog";
import PlaygroundNavContainer from "./PlaygroundNavContainer";
import { UseAiCockpitHook } from "../hooks/useAiCockpit";
import QuickRefSearchableSelect from "@/app/entities/quick-reference/QuickRefSearchableSelect";
import { SingleEntityOverlay } from "@/app/entities/layout/SingleEntityLayout";
import { CompiledRecipeOverlay } from "@/components/playground/recipes/CompiledRecipeView";
import { TbVersions } from "react-icons/tb";

interface PlaygroundHeaderCenterProps {
    currentMode?: string;
    onModeChange?: (mode: string) => void;
    onVersionChange?: (version: number) => void;
    onNewRecipe?: () => void;
    aiCockpitHook: UseAiCockpitHook;
}

const PlaygroundHeaderCenter = ({
    currentMode,
    onModeChange = () => {},
    onVersionChange = () => {},
    onNewRecipe = () => {},
    aiCockpitHook,
}: PlaygroundHeaderCenterProps) => {
    const { saveCompiledRecipe, recipeVersion, activeRecipeMatrxId, recipeRecord, activeRecipeId } = aiCockpitHook;
    const [version, setVersion] = useState(recipeVersion);
    const [isEntityOverlayOpen, setIsEntityOverlayOpen] = useState(false);
    const [isCompiledRecipeOverlayOpen, setIsCompiledRecipeOverlayOpen] = useState(false);

    useEffect(() => {
        setVersion(recipeVersion - 1);
    }, [recipeVersion]);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const handleSaveCompiledRecipe = () => {
        saveCompiledRecipe();
    };

    const handleVersionChange = (newVersion: number) => {
        setVersion(newVersion);
        onVersionChange(newVersion);
    };

    return (
        <div className="flex items-center w-full px-2 h-10">
            <div className="flex items-center gap-4 w-full">
                {/* <PlaygroundNavContainer currentMode={currentMode} onModeChange={onModeChange} /> */}

                <div className="flex items-center gap-2 flex-1 pl-5 min-w-0">
                    <Button variant="ghost" size="md" className="bg-elevation2 h-8 w-8 px-2 shrink-0" onClick={() => onNewRecipe()}>
                        <Plus size={16} />
                    </Button>

                    <div className="min-w-[160px] max-w-[320px] w-full">
                        <QuickRefSearchableSelect entityKey="recipe" />
                    </div>

                    <SingleEntityOverlay
                        entityKey="recipe"
                        isOpen={isEntityOverlayOpen}
                        onOpenChange={setIsEntityOverlayOpen}
                        trigger={
                            <Button variant="ghost" size="md" className="bg-elevation2 h-8 w-8 px-2 shrink-0">
                                <Settings size={16} />
                            </Button>
                        }
                    />

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="md"
                            className="bg-elevation2 h-8 w-8 px-2 shrink-0"
                            disabled={!activeRecipeMatrxId}
                            onClick={handleSaveCompiledRecipe}
                        >
                            <Save size={12} />
                        </Button>
                        {recipeRecord && (
                        <CompiledRecipeOverlay
                            recipeRecord={recipeRecord}
                            isOpen={isCompiledRecipeOverlayOpen}
                            onOpenChange={setIsCompiledRecipeOverlayOpen}
                            trigger={
                                <Button variant="ghost" size="md" className="bg-elevation2 h-8 w-8 px-2 shrink-0">
                                    <TbVersions size={16} />
                                </Button>
                                }
                            />
                        )}

                        {/* <Button variant="ghost" size="md" className="h-8 w-8 p-0 shrink-0" onClick={() => setIsHistoryOpen(true)}>
                            <History size={16} />
                        </Button> */}
                    </div>
                </div>

                {/* <PlaygroundHistoryDialog isOpen={isHistoryOpen} onOpenChange={setIsHistoryOpen} /> */}
            </div>
        </div>
    );
};

export default PlaygroundHeaderCenter;
