"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import OverviewTab from "../../tabs/OverviewTab";
import ArgumentsTab from "../../tabs/ArgumentsTab";
import RecipeBasicInfoSection from "./RecipeBasicInfoSection";
import RecipeSelectionSection from "./RecipeSelectionSection";
import DefaultNodeEditor from "../../DefaultNodeEditor";
import CustomNodeEditor from "../../CustomNodeEditor";
import { BaseNode } from "@/features/workflows/types";
import { getCompiledRecipeByVersionWithNeededBrokers, NeededBroker, RecipeConfig } from "@/features/workflows/service/recipe-service";
import RecipeDetailsTab from "./RecipeDetailsTab";
import RecipeMessagesTab from "./RecipeMessagesTab";

interface RecipeNodeEditorProps {
    node: BaseNode;
    onSave: (node: BaseNode) => void;
    onClose: () => void;
    open: boolean;
}

const MANAGED_ARGUMENTS = ["recipe_id", "version", "latest_version"];

/**
 * RecipeNodeEditor - Custom node editor specifically for recipe nodes
 * Uses the modular OverviewTab system with custom sections
 */
const RecipeNodeEditor: React.FC<RecipeNodeEditorProps> = ({ node, onSave, onClose, open }) => {
    // Local state for recipe details
    const [recipeDetails, setRecipeDetails] = useState<RecipeConfig | null>(null);
    const [neededBrokers, setNeededBrokers] = useState<NeededBroker[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Simple local state for recipe parameters to track changes
    const [currentRecipeId, setCurrentRecipeId] = useState<string>("");
    const [currentVersion, setCurrentVersion] = useState<number | undefined>(undefined);
    
    const lastFetchKeyRef = useRef<string>("");

    // Helper function to get recipe_id and version from node
    const getRecipeParams = useCallback((currentNode: BaseNode) => {
        const recipeIdArg = currentNode.arg_overrides?.find((arg) => arg.name === "recipe_id");
        const versionArg = currentNode.arg_overrides?.find((arg) => arg.name === "version");

        const recipeId = recipeIdArg?.default_value as string || "";
        const version = versionArg?.default_value as number | null;
        
        // Only use version if it's a valid integer
        const versionToUse = (typeof version === "number" && Number.isInteger(version)) ? version : undefined;

        return { recipeId, version: versionToUse };
    }, []);

    // Initialize recipe parameters on mount
    useEffect(() => {
        const { recipeId, version } = getRecipeParams(node);
        setCurrentRecipeId(recipeId);
        setCurrentVersion(version);
        
        // Initial fetch if we have a recipe ID
        if (recipeId) {
            fetchRecipeDetails(recipeId, version);
        }
    }, []); // Only run on mount

    // Function to fetch recipe details
    const fetchRecipeDetails = useCallback(
        async (recipeId: string, version?: number) => {
            if (!recipeId) {
                setRecipeDetails(null);
                setError(null);
                lastFetchKeyRef.current = "";
                return;
            }

            const fetchKey = `${recipeId}-${version || "latest"}`;
            if (fetchKey === lastFetchKeyRef.current) return; // Avoid duplicate fetches

            setLoading(true);
            setError(null);
            lastFetchKeyRef.current = fetchKey;

            try {
                const details = await getCompiledRecipeByVersionWithNeededBrokers(recipeId, version || undefined);
                setRecipeDetails(details);
                setNeededBrokers(details.neededBrokers || []);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to fetch recipe details";
                setError(errorMessage);
                console.error("Error fetching recipe details:", err);
            } finally {
                setLoading(false);
            }
        },
        [] // No dependencies, function is stable
    );

    // Enhanced node update handler that analyzes changes and triggers fetches
    const handleNodeUpdate = useCallback((updatedNode: BaseNode) => {
        // Get recipe params from the updated node
        const { recipeId: newRecipeId, version: newVersion } = getRecipeParams(updatedNode);
        
        // Check if recipe parameters changed
        const recipeChanged = newRecipeId !== currentRecipeId;
        const versionChanged = newVersion !== currentVersion;
        
        if (recipeChanged || versionChanged) {
            console.log('Recipe parameters changed:', { 
                oldRecipeId: currentRecipeId, 
                newRecipeId, 
                oldVersion: currentVersion, 
                newVersion 
            });
            
            // Update local state
            setCurrentRecipeId(newRecipeId);
            setCurrentVersion(newVersion);
            
            // Trigger fetch with new parameters
            fetchRecipeDetails(newRecipeId, newVersion);
        }
        
        // CRITICAL: Always call the original onNodeUpdate to preserve normal flow
        // This is a side effect, not an interception
        return updatedNode;
    }, [currentRecipeId, currentVersion, getRecipeParams, fetchRecipeDetails]);

    // Create a custom OverviewTab component with recipe-specific sections
    const RecipeOverviewTab = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => {
        const wrappedUpdate = useCallback((updatedNode: BaseNode) => {
            // Do our analysis first
            handleNodeUpdate(updatedNode);
            // Then call the original update
            onNodeUpdate(updatedNode);
        }, [onNodeUpdate]);

        return (
            <OverviewTab
                node={node}
                onNodeUpdate={wrappedUpdate}
                customSections={{
                    "basic-info": RecipeBasicInfoSection,
                    "function-info": RecipeSelectionSection,
                }}
                argsToHide={MANAGED_ARGUMENTS}
            />
        );
    };

    // Create a custom ArgumentsTab component that hides recipe-specific arguments
    const RecipeArgumentsTab = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => {
        const wrappedUpdate = useCallback((updatedNode: BaseNode) => {
            // Do our analysis first
            handleNodeUpdate(updatedNode);
            // Then call the original update
            onNodeUpdate(updatedNode);
        }, [onNodeUpdate]);

        return (
            <ArgumentsTab node={node} onNodeUpdate={wrappedUpdate} argsToHide={MANAGED_ARGUMENTS} />
        );
    };

    // Create a custom RecipeDetailsTab wrapper
    const RecipeDetailsTabWrapper = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => (
        <RecipeDetailsTab node={node} onNodeUpdate={onNodeUpdate} recipeDetails={recipeDetails} loading={loading} error={error} />
    );

    // Create a custom RecipeMessagesTab wrapper
    const RecipeMessagesTabWrapper = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => (
        <RecipeMessagesTab node={node} onNodeUpdate={onNodeUpdate} recipeDetails={recipeDetails} loading={loading} error={error} neededBrokers={neededBrokers} />
    );

    const RecipeDefaultNodeEditor = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => (
        <DefaultNodeEditor
            node={node}
            onNodeUpdate={onNodeUpdate}
            customTabs={[
                {
                    id: "basic",
                    label: "Overview",
                    component: RecipeOverviewTab,
                    replaces: "basic", // Replace the default overview tab
                    order: 1, // First tab
                },
                {
                    id: "recipe-details",
                    label: "Recipe",
                    component: RecipeDetailsTabWrapper,
                    replaces: null, // Add as new tab
                    order: 2, // Second tab
                },
                {
                    id: "recipe-messages",
                    label: "Messages",
                    component: RecipeMessagesTabWrapper,
                    replaces: null, // Add as new tab
                    order: 3, // Third tab
                },
                {
                    id: "arguments",
                    label: "Arguments",
                    component: RecipeArgumentsTab,
                    replaces: "arguments", // Replace the default arguments tab
                    order: 4, // Fourth tab
                },
            ]}
        />
    );

    return (
        <CustomNodeEditor
            node={node}
            onSave={onSave}
            onClose={onClose}
            open={open}
            title="Run Recipe Configuration"
            component={RecipeDefaultNodeEditor}
        />
    );
};

export default RecipeNodeEditor;
