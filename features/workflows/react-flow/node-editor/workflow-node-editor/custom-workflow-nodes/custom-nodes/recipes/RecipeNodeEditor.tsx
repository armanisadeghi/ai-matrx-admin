"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import OverviewTab from "../../tabs/OverviewTab";
import ArgumentsTab from "../../tabs/ArgumentsTab";
import RecipeBasicInfoSection from "./RecipeBasicInfoSection";
import RecipeSelectionSection from "./RecipeSelectionSection";
import DefaultNodeEditor from "../../DefaultNodeEditor";
import CustomNodeEditor from "../../CustomNodeEditor";
import { DbFunctionNode } from "@/features/workflows/types";
import { getCompiledRecipeByVersionWithNeededBrokers, NeededBroker, RecipeConfig } from "@/features/workflows/service/recipe-service";
import RecipeDetailsTab from "./RecipeDetailsTab";
import RecipeMessagesTab from "./RecipeMessagesTab";
import BrokersTab from "../../tabs/BrokersTab";
import { NodeDefinitionType, CustomTab } from "../custom-node-definitions";
import RecipeDependenciesTab from "./RecipeDependenciesTab";
import { EnrichedBroker } from "@/features/workflows/utils/data-flow-manager";

interface RecipeNodeEditorProps {
    nodeData: DbFunctionNode;
    onSave: (nodeData: DbFunctionNode) => void;
    onClose: () => void;
    open: boolean;
    nodeDefinition: NodeDefinitionType;
    enrichedBrokers: EnrichedBroker[];
}

const RecipeNodeEditor: React.FC<RecipeNodeEditorProps> = ({ nodeData, onSave, onClose, open, nodeDefinition, enrichedBrokers }) => {

    const [recipeDetails, setRecipeDetails] = useState<RecipeConfig | null>(null);
    const [neededBrokers, setNeededBrokers] = useState<NeededBroker[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [currentRecipeId, setCurrentRecipeId] = useState<string>("");
    const [currentVersion, setCurrentVersion] = useState<number | undefined>(undefined);

    const lastFetchKeyRef = useRef<string>("");

    // Helper function to get recipe_id and version from node using definition
    const getRecipeParams = useCallback((currentNode: DbFunctionNode) => {
        const recipeIdArg = currentNode.arg_overrides?.find((arg) => arg.name === nodeDefinition.dynamic_broker_arg);
        const versionArg = currentNode.arg_overrides?.find((arg) => arg.name === "version");
        const recipeId = (recipeIdArg?.default_value as string) || "";
        const version = versionArg?.default_value as number | null;
        const versionToUse = typeof version === "number" && Number.isInteger(version) ? version : undefined;
        return { recipeId, version: versionToUse };
    }, []);

    // Initialize recipe parameters on mount
    useEffect(() => {
        const { recipeId, version } = getRecipeParams(nodeData);
        setCurrentRecipeId(recipeId);
        setCurrentVersion(version);

        // Initial fetch if we have a recipe ID
        if (recipeId) {
            fetchRecipeDetails(recipeId, version);
        }
    }, []); // Only run on mount

    // Function to fetch recipe details
    const fetchRecipeDetails = useCallback(async (recipeId: string, version?: number) => {
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
    }, []);


    // Enhanced node update handler that analyzes changes and triggers fetches
    const handleNodeUpdate = useCallback(
        (updatedNode: DbFunctionNode) => {
            // Get recipe params from the updated node
            const { recipeId: newRecipeId, version: newVersion } = getRecipeParams(updatedNode);

            // Check if recipe parameters changed
            const recipeChanged = newRecipeId !== currentRecipeId;
            const versionChanged = newVersion !== currentVersion;

            let nodeWithUpdates = updatedNode;

            // Always ensure node definition is stored in metadata for BrokersTab
            nodeWithUpdates = {
                ...nodeWithUpdates,
                metadata: {
                    ...nodeWithUpdates.metadata,
                    nodeDefinition: nodeDefinition,
                },
            };

            if (recipeChanged || versionChanged) {
                // Update local state
                setCurrentRecipeId(newRecipeId);
                setCurrentVersion(newVersion);

                // Trigger fetch with new parameters
                fetchRecipeDetails(newRecipeId, newVersion);
            }

            // CRITICAL: Always return the updated node
            return nodeWithUpdates;
        },
        [currentRecipeId, currentVersion, getRecipeParams, fetchRecipeDetails]
    );

    // Note: Broker dependency management is now handled by BrokersTab through the centralized system
    // We no longer manage broker dependencies locally in the recipe node

    // Create a custom OverviewTab component with recipe-specific sections
    const RecipeOverviewTab = ({
        nodeData,
        onNodeUpdate,
    }: {
        nodeData: DbFunctionNode;
        onNodeUpdate: (nodeData: DbFunctionNode) => void;
    }) => {
        const wrappedUpdate = useCallback(
            (updatedNode: DbFunctionNode) => {
                // Do our analysis and metadata update first
                const nodeWithUpdates = handleNodeUpdate(updatedNode);

                // Then call the original update with the enhanced node
                onNodeUpdate(nodeWithUpdates);
            },
            [onNodeUpdate]
        );

        // Map definition custom sections to actual components
        const customSections: { [key: string]: React.ComponentType<any> } = {};

        Object.entries(nodeDefinition.custom_sections).forEach(([key, componentName]) => {
            switch (componentName) {
                case "RecipeBasicInfoSection":
                    customSections[key] = RecipeBasicInfoSection;
                    break;
                case "RecipeSelectionSection":
                    customSections[key] = RecipeSelectionSection;
                    break;
                default:
                    console.warn(`Unknown custom section component: ${componentName}`);
            }
        });

        return (
            <OverviewTab
                nodeData={nodeData}
                onNodeUpdate={wrappedUpdate}
                customSections={customSections}
                argsToHide={nodeDefinition.managed_arguments}
                enrichedBrokers={enrichedBrokers}
            />
        );
    };


    const RecipeDependenciesWrapper = ({
        nodeData,
        onNodeUpdate,
    }: {
        nodeData: DbFunctionNode;
        onNodeUpdate: (nodeData: DbFunctionNode) => void;
    }) => {
        return <RecipeDependenciesTab nodeData={nodeData} onNodeUpdate={onNodeUpdate} neededBrokers={neededBrokers} enrichedBrokers={enrichedBrokers} />;
    };

    // Create a custom ArgumentsTab component that hides recipe-specific arguments
    const RecipeArgumentsTab = ({
        nodeData,
        onNodeUpdate,
    }: {
        nodeData: DbFunctionNode;
        onNodeUpdate: (nodeData: DbFunctionNode) => void;
    }) => {
        const wrappedUpdate = useCallback(
            (updatedNode: DbFunctionNode) => {
                // Do our analysis and known brokers update first
                const nodeWithUpdates = handleNodeUpdate(updatedNode);
                // Then call the original update with the enhanced node
                onNodeUpdate(nodeWithUpdates);
            },
            [onNodeUpdate]
        );

        return <ArgumentsTab nodeData={nodeData} onNodeUpdate={wrappedUpdate} argsToHide={nodeDefinition.managed_arguments} enrichedBrokers={enrichedBrokers} />;
    };

    // Create a custom RecipeDetailsTab wrapper
    const RecipeDetailsTabWrapper = ({
        nodeData,
        onNodeUpdate,
    }: {
        nodeData: DbFunctionNode;
        onNodeUpdate: (nodeData: DbFunctionNode) => void;
    }) => (
        <RecipeDetailsTab nodeData={nodeData} onNodeUpdate={onNodeUpdate} recipeDetails={recipeDetails} loading={loading} error={error} enrichedBrokers={enrichedBrokers} />
    );

    // Create a custom RecipeMessagesTab wrapper
    const RecipeMessagesTabWrapper = ({
        nodeData,
        onNodeUpdate,
    }: {
        nodeData: DbFunctionNode;
        onNodeUpdate: (nodeData: DbFunctionNode) => void;
    }) => (
        <RecipeMessagesTab
            nodeData={nodeData}
            onNodeUpdate={onNodeUpdate}
            recipeDetails={recipeDetails}
            loading={loading}
            error={error}
            neededBrokers={neededBrokers}
            enrichedBrokers={enrichedBrokers}
        />
    );

    // Enhanced onSave that ensures dependencies are up to date
    const handleSave = useCallback(
        (nodeToSave: DbFunctionNode) => {
            // Call the original onSave
            onSave(nodeToSave);
        },
        [onSave]
    );

    const RecipeDefaultNodeEditor = ({
        nodeData,
        onNodeUpdate,
    }: {
        nodeData: DbFunctionNode;
        onNodeUpdate: (nodeData: DbFunctionNode) => void;
    }) => {
        // Map definition tab configs to actual components
        const customTabs = nodeDefinition.custom_tabs
            .map((tabConfig: CustomTab) => {
                let component;

                switch (tabConfig.component) {
                    case "RecipeOverviewTab":
                        component = RecipeOverviewTab;
                        break;
                    case "RecipeDetailsTab":
                        component = RecipeDetailsTabWrapper;
                        break;
                    case "RecipeMessagesTab":
                        component = RecipeMessagesTabWrapper;
                        break;
                    case "RecipeArgumentsTab":
                        component = RecipeArgumentsTab;
                        break;
                    case "BrokersTab":
                        component = BrokersTab;
                        break;
                    case "RecipeDependenciesTab":
                        component = RecipeDependenciesWrapper;
                        break;
                    default:
                        console.warn(`Unknown component: ${tabConfig.component}`);
                        return null;
                }

                return {
                    id: tabConfig.id,
                    label: tabConfig.label,
                    component,
                    replaces: tabConfig.replaces,
                    order: tabConfig.order,
                };
            })
            .filter(Boolean); // Remove any null entries

        return <DefaultNodeEditor nodeData={nodeData} onNodeUpdate={onNodeUpdate} customTabs={customTabs} enrichedBrokers={enrichedBrokers} />;
    };

    return (
        <CustomNodeEditor
            nodeData={nodeData}
            onSave={handleSave}
            onClose={onClose}
            open={open}
            nodeDefinition={nodeDefinition}
            component={RecipeDefaultNodeEditor}
            enrichedBrokers={enrichedBrokers}
        />
    );
};

export default RecipeNodeEditor;
