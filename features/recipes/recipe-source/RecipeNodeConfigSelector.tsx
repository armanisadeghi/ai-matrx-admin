"use client";
import React from "react";
import RecipeSelectionList, { RecipeNodeDefaults, InitialConfig } from "./RecipeSelectionList";

interface RecipeNodeConfigSelectorProps {
    /**
     * Initial recipe configuration (recipeId, version, latestVersion)
     */
    initialConfig?: InitialConfig | null;
    
    /**
     * Callback when recipe node defaults are set
     */
    onNodeDefaultsSet?: (nodeDefaults: RecipeNodeDefaults | null) => void;
    
    /**
     * Callback when selection is confirmed
     */
    onConfirm?: () => void;
    
    /**
     * Callback when selection is cancelled
     */
    onCancel?: () => void;
    
    /**
     * Version display mode - defaults to "card" for better UX
     */
    versionDisplay?: "card" | "list";
    
    /**
     * Custom footer renderer
     */
    renderFooter?: (confirmHandler: () => Promise<void>, isConfirmDisabled: boolean) => React.ReactNode;
}

/**
 * Simplified wrapper around RecipeSelectionList focused specifically on 
 * recipe node configuration. This component removes complexity and focuses
 * only on selecting recipes and configuring their node defaults.
 */
export const RecipeNodeConfigSelector: React.FC<RecipeNodeConfigSelectorProps> = ({
    initialConfig = null,
    onNodeDefaultsSet,
    onConfirm,
    onCancel,
    versionDisplay = "card",
    renderFooter,
}) => {
    return (
        <RecipeSelectionList
            initialConfig={initialConfig}
            setRecipeNodeDefaults={onNodeDefaultsSet}
            onConfirm={onConfirm}
            onCancel={onCancel}
            versionDisplay={versionDisplay}
            renderFooter={renderFooter}
            // Explicitly set unused props to undefined/null to keep interface clean
            initialSelectedRecipe={null}
            onRecipeSelected={undefined}
            setCompiledRecipeId={undefined}
            setNewApplet={undefined}
            setRecipeSourceConfig={undefined}
        />
    );
};

export default RecipeNodeConfigSelector; 