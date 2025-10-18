"use client";

import React, { useEffect, useState } from "react";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import { UseAiCockpitHook } from "../hooks/useAiCockpit";
import QuickRefSearchableSelect from "@/app/entities/quick-reference/QuickRefSearchableSelect";
import { SingleEntityOverlay } from "@/app/entities/layout/SingleEntityLayout";
import { CompiledRecipeOverlay } from "@/components/playground/recipes/CompiledRecipeView";
import { TbVersions } from "react-icons/tb";
import PanelToggle from "@/components/matrx/PanelToggle";
import { Play, Plus, Settings, Save, MoreHorizontal, PanelLeft, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/ButtonMine";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface PlaygroundHeaderProps {
    initialSettings?: {
        recipe?: QuickReferenceRecord;
        version?: number;
    };
    onToggleBrokers?: () => void;
    onToggleSettings?: () => void;
    onShowCode?: () => void;
    currentMode?: string;
    onNewRecipe?: () => void;
    onModeChange?: (mode: string) => void;
    onVersionChange?: (version: number) => void;
    onPlay?: () => void;
    isLeftCollapsed?: boolean;
    isRightCollapsed?: boolean;
    fullScreenToggleButton?: React.ReactNode;
    aiCockpitHook: UseAiCockpitHook;
}

const PlaygroundHeaderAllInOne = ({
    initialSettings = {},
    onToggleBrokers = () => {},
    onToggleSettings = () => {},
    onShowCode = () => {},
    currentMode = "prompt",
    onModeChange = () => {},
    onNewRecipe = () => {},
    onVersionChange = () => {},
    onPlay = () => {},
    isLeftCollapsed,
    isRightCollapsed,
    fullScreenToggleButton,
    aiCockpitHook,
}: PlaygroundHeaderProps) => {
    const { saveCompiledRecipe, recipeVersion, activeRecipeMatrxId, recipeRecord, activeRecipeId } = aiCockpitHook;
    const [isEntityOverlayOpen, setIsEntityOverlayOpen] = useState(false);
    const [isCompiledRecipeOverlayOpen, setIsCompiledRecipeOverlayOpen] = useState(false);

    const handleSaveCompiledRecipe = () => {
        saveCompiledRecipe();
    };

    return (
        <div className="flex items-center gap-2 h-full bg-textured">
            {/* Mobile - Always dropdown */}
            <div className="md:hidden">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onClick={onNewRecipe}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Recipe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsEntityOverlayOpen(true)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Recipe Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={handleSaveCompiledRecipe}
                            disabled={!activeRecipeMatrxId}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Recipe
                        </DropdownMenuItem>
                        {recipeRecord && (
                            <DropdownMenuItem onClick={() => setIsCompiledRecipeOverlayOpen(true)}>
                                <TbVersions className="h-4 w-4 mr-2" />
                                View Versions
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onToggleBrokers}>
                            <PanelLeft className="h-4 w-4 mr-2" />
                            {isLeftCollapsed ? 'Show' : 'Hide'} Brokers
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onToggleSettings}>
                            <PanelRight className="h-4 w-4 mr-2" />
                            {isRightCollapsed ? 'Show' : 'Hide'} Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onPlay}>
                            <Play className="h-4 w-4 mr-2" />
                            Run Recipe
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Desktop - Inline controls */}
            <div className="hidden md:flex items-center gap-2">
                {/* Panel toggles */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleBrokers}
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={`${isLeftCollapsed ? 'Show' : 'Hide'} Brokers Panel`}
                    >
                        <PanelLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleSettings}
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={`${isRightCollapsed ? 'Show' : 'Hide'} Settings Panel`}
                    >
                        <PanelRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Recipe controls */}
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onNewRecipe}
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="New Recipe"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>

                    {/* Recipe selector - only show on larger screens */}
                    <div className="hidden lg:block min-w-[160px] max-w-[200px]">
                        <QuickRefSearchableSelect entityKey="recipe" />
                    </div>

                    <SingleEntityOverlay
                        entityKey="recipe"
                        isOpen={isEntityOverlayOpen}
                        onOpenChange={setIsEntityOverlayOpen}
                        trigger={
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="Recipe Settings"
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                        }
                    />

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        disabled={!activeRecipeMatrxId}
                        onClick={handleSaveCompiledRecipe}
                        title="Save Recipe"
                    >
                        <Save className="h-4 w-4" />
                    </Button>

                    {recipeRecord && (
                        <CompiledRecipeOverlay
                            recipeRecord={recipeRecord}
                            isOpen={isCompiledRecipeOverlayOpen}
                            onOpenChange={setIsCompiledRecipeOverlayOpen}
                            trigger={
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title="View Versions"
                                >
                                    <TbVersions className="h-4 w-4" />
                                </Button>
                            }
                        />
                    )}
                </div>

                {/* Run button - always visible on desktop */}
                <Button 
                    size="sm" 
                    onClick={onPlay}
                    className="gap-1 bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                >
                    <Play className="h-3 w-3 fill-current" />
                    <span className="text-xs">Run</span>
                </Button>
            </div>

            {/* Hidden overlays for mobile dropdown triggers */}
            <SingleEntityOverlay
                entityKey="recipe"
                isOpen={isEntityOverlayOpen}
                onOpenChange={setIsEntityOverlayOpen}
                trigger={<div />}
            />

            {recipeRecord && (
                <CompiledRecipeOverlay
                    recipeRecord={recipeRecord}
                    isOpen={isCompiledRecipeOverlayOpen}
                    onOpenChange={setIsCompiledRecipeOverlayOpen}
                    trigger={<div />}
                />
            )}
        </div>
    );
};

export default PlaygroundHeaderAllInOne;
