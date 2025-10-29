"use client";

import { Card } from "@/components/ui/card";
import IconButton from "@/components/official/IconButton";
import { Eye, Pencil, Copy, Trash2, Loader2, ChefHat, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { RecipeVersionSelector } from "@/components/playground/recipes/RecipeVersionSelector";

interface RecipeCardProps {
    id: string;
    name: string;
    description?: string;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onNavigate?: (id: string, path: string) => void;
    isDeleting?: boolean;
    isDuplicating?: boolean;
    isNavigating?: boolean;
    isAnyNavigating?: boolean;
}

export function RecipeCard({
    id,
    name,
    description,
    onDelete,
    onDuplicate,
    onNavigate,
    isDeleting,
    isDuplicating,
    isNavigating,
    isAnyNavigating
}: RecipeCardProps) {
    const [isConversionDialogOpen, setIsConversionDialogOpen] = useState(false);

    const handleView = () => {
        if (onNavigate && !isAnyNavigating) {
            onNavigate(id, `/ai/cockpit/recipes/${id}`);
        }
    };

    const handleEdit = () => {
        if (onNavigate && !isAnyNavigating) {
            onNavigate(id, `/ai/cockpit/recipes/${id}/edit`);
        }
    };

    const handleDuplicate = () => {
        if (onDuplicate) {
            onDuplicate(id);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(id);
        }
    };

    const handleConvert = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDisabled) {
            setIsConversionDialogOpen(true);
        }
    };

    const handleCardClick = () => {
        if (!isDisabled) {
            handleView();
        }
    };

    // Disable all interactions when navigating or when any card is navigating
    const isDisabled = isNavigating || isAnyNavigating;

    return (
        <>
            <Card 
                className={`flex flex-col h-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all duration-200 overflow-hidden relative ${
                    isDisabled 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer hover:scale-[1.02] group'
                }`}
                onClick={isDisabled ? undefined : handleCardClick}
                title={isDisabled ? (isNavigating ? "Navigating..." : "Please wait...") : "Click to view recipe"}
            >
                {/* Loading Overlay */}
                {isNavigating && (
                    <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-sm z-20 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-spin" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Loading...</span>
                        </div>
                    </div>
                )}
                
                {/* Recipe Icon */}
                <div className="absolute top-3 left-3 z-10">
                    <div className={`w-8 h-8 bg-purple-500 dark:bg-purple-600 rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 ${
                        !isDisabled && 'group-hover:bg-purple-600 dark:group-hover:bg-purple-700 group-hover:shadow-md group-hover:scale-105'
                    }`}>
                        <ChefHat className={`w-4 h-4 text-white transition-transform duration-200 ${
                            !isDisabled && 'group-hover:scale-110'
                        }`} />
                    </div>
                </div>
                
                <div className="p-6 pl-12 flex-1 flex items-center justify-center">
                    <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 text-center line-clamp-3 break-words transition-colors duration-200 ${
                        !isDisabled && 'group-hover:text-purple-600 dark:group-hover:text-purple-400'
                    }`}>
                        {name || "Untitled Recipe"}
                    </h3>
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-100 dark:bg-slate-900 rounded-b-lg">
                    <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                            icon={ArrowRightLeft}
                            tooltip={isDisabled ? "Please wait..." : "Convert to Prompt"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={handleConvert}
                            disabled={isDisabled}
                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                        />
                        <IconButton
                            icon={Pencil}
                            tooltip={isDisabled ? "Please wait..." : "Edit"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={handleEdit}
                            disabled={isDisabled}
                        />
                        <IconButton
                            icon={Eye}
                            tooltip={isDisabled ? "Please wait..." : "View"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={handleView}
                            disabled={isDisabled}
                        />
                        <IconButton
                            icon={isDuplicating ? Loader2 : Copy}
                            tooltip={isDuplicating ? "Duplicating..." : isDisabled ? "Please wait..." : "Duplicate"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={handleDuplicate}
                            disabled={isDuplicating || isDisabled}
                            iconClassName={isDuplicating ? "animate-spin" : ""}
                        />
                        <IconButton
                            icon={isDeleting ? Loader2 : Trash2}
                            tooltip={isDeleting ? "Deleting..." : isDisabled ? "Please wait..." : "Delete"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={handleDelete}
                            disabled={isDeleting || isDisabled}
                            iconClassName={isDeleting ? "animate-spin" : ""}
                        />
                    </div>
                </div>
            </Card>

            <RecipeVersionSelector
                recipeId={id}
                recipeName={name}
                isOpen={isConversionDialogOpen}
                onOpenChange={setIsConversionDialogOpen}
            />
        </>
    );
}

