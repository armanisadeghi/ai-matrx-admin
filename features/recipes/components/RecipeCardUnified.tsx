"use client";

import { Card } from "@/components/ui/card";
import IconButton from "@/components/official/IconButton";
import { Eye, Pencil, Copy, Trash2, Loader2, ChefHat, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { RecipeVersionSelector } from "@/components/playground/recipes/RecipeVersionSelector";
import { Recipe } from "../config/recipes-config";
import { RenderCardActions } from "@/components/official/unified-list/types";

interface RecipeCardUnifiedProps {
    recipe: Recipe;
    actions: RenderCardActions<Recipe>;
    onConvert?: (recipeId: string) => void;
}

/**
 * RecipeCardUnified
 * 
 * Recipe card component that works with UnifiedListLayout.
 * Receives actions from the unified system and handles recipe-specific display.
 */
export function RecipeCardUnified({ recipe, actions, onConvert }: RecipeCardUnifiedProps) {
    const [isConversionDialogOpen, setIsConversionDialogOpen] = useState(false);

    const handleConvert = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDisabled) {
            setIsConversionDialogOpen(true);
        }
    };

    const handleCardClick = () => {
        if (!isDisabled) {
            actions.onView();
        }
    };

    // Disable all interactions when navigating or when any card is navigating
    const isDisabled = actions.isNavigating || actions.isAnyNavigating;

    return (
        <>
            <Card
                className={`flex flex-col h-full bg-card border border-border transition-all duration-200 overflow-hidden relative ${
                    isDisabled
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 cursor-pointer hover:scale-[1.02] group"
                }`}
                onClick={isDisabled ? undefined : handleCardClick}
                title={
                    isDisabled
                        ? actions.isNavigating
                            ? "Navigating..."
                            : "Please wait..."
                        : "Click to view recipe"
                }
            >
                {/* Loading Overlay */}
                {actions.isNavigating && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="text-sm font-medium text-foreground">Loading...</span>
                        </div>
                    </div>
                )}

                {/* Recipe Icon */}
                <div className="absolute top-3 left-3 z-10">
                    <div
                        className={`w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 ${
                            !isDisabled && "group-hover:bg-primary/90 group-hover:shadow-md group-hover:scale-105"
                        }`}
                    >
                        <ChefHat
                            className={`w-4 h-4 text-primary-foreground transition-transform duration-200 ${
                                !isDisabled && "group-hover:scale-110"
                            }`}
                        />
                    </div>
                </div>

                <div className="p-6 pl-12 flex-1 flex items-center justify-center">
                    <h3
                        className={`text-lg font-semibold text-foreground text-center line-clamp-3 break-words transition-colors duration-200 ${
                            !isDisabled && "group-hover:text-primary"
                        }`}
                    >
                        {recipe.name || "Untitled Recipe"}
                    </h3>
                </div>

                <div className="border-t border-border p-4 bg-muted rounded-b-lg">
                    <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                        {/* Convert Action (Custom) */}
                        {actions.customActions.find((a) => a.id === "convert") && (
                            <IconButton
                                icon={ArrowRightLeft}
                                tooltip={isDisabled ? "Please wait..." : "Convert to Prompt"}
                                size="sm"
                                variant="ghost"
                                tooltipSide="top"
                                tooltipAlign="center"
                                onClick={handleConvert}
                                disabled={isDisabled}
                            />
                        )}

                        {/* Edit Action */}
                        <IconButton
                            icon={Pencil}
                            tooltip={isDisabled ? "Please wait..." : "Edit"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={actions.onEdit}
                            disabled={isDisabled}
                        />

                        {/* View Action */}
                        <IconButton
                            icon={Eye}
                            tooltip={isDisabled ? "Please wait..." : "View"}
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={actions.onView}
                            disabled={isDisabled}
                        />

                        {/* Duplicate Action */}
                        <IconButton
                            icon={actions.isDuplicating ? Loader2 : Copy}
                            tooltip={
                                actions.isDuplicating
                                    ? "Duplicating..."
                                    : isDisabled
                                    ? "Please wait..."
                                    : "Duplicate"
                            }
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={actions.onDuplicate}
                            disabled={actions.isDuplicating || isDisabled}
                            iconClassName={actions.isDuplicating ? "animate-spin" : ""}
                        />

                        {/* Delete Action */}
                        <IconButton
                            icon={actions.isDeleting ? Loader2 : Trash2}
                            tooltip={
                                actions.isDeleting
                                    ? "Deleting..."
                                    : isDisabled
                                    ? "Please wait..."
                                    : "Delete"
                            }
                            size="sm"
                            variant="ghost"
                            tooltipSide="top"
                            tooltipAlign="center"
                            onClick={actions.onDelete}
                            disabled={actions.isDeleting || isDisabled}
                            iconClassName={actions.isDeleting ? "animate-spin" : ""}
                        />
                    </div>
                </div>
            </Card>

            {/* Recipe Conversion Dialog */}
            <RecipeVersionSelector
                recipeId={recipe.id}
                recipeName={recipe.name}
                isOpen={isConversionDialogOpen}
                onOpenChange={setIsConversionDialogOpen}
            />
        </>
    );
}

