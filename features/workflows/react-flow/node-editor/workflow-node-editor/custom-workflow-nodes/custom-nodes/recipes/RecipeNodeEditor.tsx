"use client";

/**
 * RECIPE_NODE_DEFINITION Integration Test
 * 
 * This file demonstrates a data-driven approach to custom node configuration.
 * Instead of hardcoded values, all configuration comes from RECIPE_NODE_DEFINITION.
 * 
 * Testing Scenarios:
 * 1. Create a new recipe node in workflow editor
 * 2. Set recipe_id to any value (e.g., "test_recipe")
 * 3. Check browser console for "✅ RECIPE_NODE_DEFINITION Integration Test" logs
 * 4. Navigate to Brokers tab - should show 8 auto-generated brokers with pattern: {recipe_id}_content, {recipe_id}_lines, etc.
 * 5. Change recipe_id - brokers should update dynamically
 * 6. Known brokers should be read-only, return broker overrides should be editable
 * 
 * What's been eliminated from hardcoded:
 * - MANAGED_ARGUMENTS array -> RECIPE_NODE_DEFINITION.managed_arguments
 * - Broker definitions -> RECIPE_NODE_DEFINITION.predefined_brokers  
 * - Editor title -> RECIPE_NODE_DEFINITION.editor_title
 * - Custom sections -> RECIPE_NODE_DEFINITION.custom_sections
 * - Custom tabs -> RECIPE_NODE_DEFINITION.custom_tabs
 * - Dynamic broker arg name -> RECIPE_NODE_DEFINITION.dynamic_broker_arg
 */

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
import { updateNodeWithKnownBrokers, computeKnownBrokers } from "@/features/workflows/utils/knownBrokersRegistry";

interface RecipeNodeEditorProps {
    node: BaseNode;
    onSave: (node: BaseNode) => void;
    onClose: () => void;
    open: boolean;
}

export const RECIPE_NODE_DEFINITION = {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "registered_function_id": "123e4567-e89b-12d3-a456-426614174000",
    "node_type": "recipe",
    "name": "Run Recipe",
    "description": "Orchestrates execution of a single recipe and returns multiple structured outputs",
    "is_active": true,
    "managed_arguments": ["recipe_id", "version", "latest_version"],
    "required_arguments": ["recipe_id"],
    "argument_defaults": {
        "latest_version": true,
        "version": null
    },
    "dynamic_broker_arg": "recipe_id",
    "predefined_brokers": [
        {
            "id": "{recipe_id}_content",
            "label": "Recipe Content",
            "description": "The direct text content in full.",
            "dataType": "string",
            "guaranteed": true,
            "dynamic_id": true
        },
        {
            "id": "{recipe_id}_lines",
            "label": "Content Lines",
            "description": "Response is identified by the type of line with an entry for type and content.",
            "dataType": "array",
            "guaranteed": true,
            "dynamic_id": true
        },
        {
            "id": "{recipe_id}_sections",
            "label": "Content Sections",
            "description": "Sections automatically identified so each section type has children which are each a line entry (type/content).",
            "dataType": "array",
            "guaranteed": true,
            "dynamic_id": true
        },
        {
            "id": "{recipe_id}_section_texts",
            "label": "Section Texts",
            "description": "Sections automatically identified but all of the content is directly a single markdown string. Ideal for passing to another recipe directly.",
            "dataType": "array",
            "guaranteed": true,
            "dynamic_id": true
        },
        {
            "id": "{recipe_id}_sections_by_header",
            "label": "Sections by Header",
            "description": "Same as Content Sections but focused only on headers.",
            "dataType": "object",
            "guaranteed": true,
            "dynamic_id": true
        },
        {
            "id": "{recipe_id}_section_texts_by_header",
            "label": "Section Texts by Header",
            "description": "Same as Section Texts but focused only on headers.",
            "dataType": "object",
            "guaranteed": true,
            "dynamic_id": true
        },
        {
            "id": "{recipe_id}_sections_by_big_headers",
            "label": "Sections by Big Headers",
            "description": "Same as Content Sections but but will nest smaller headers such as h2 and h3 under h1.",
            "dataType": "object",
            "guaranteed": true,
            "dynamic_id": true
        },
        {
            "id": "{recipe_id}_section_texts_by_big_headers",
            "label": "Section Texts by Big Headers",
            "description": "Same as Section Texts but will nest smaller headers such as h2 and h3 under h1.",
            "dataType": "object",
            "guaranteed": true,
            "dynamic_id": true
        }
    ],
    "editor_title": "Run Recipe Configuration",
    "custom_sections": {
        "basic-info": "RecipeBasicInfoSection",
        "function-info": "RecipeSelectionSection"
    },
    "custom_tabs": [
        {
            "id": "basic",
            "label": "Overview",
            "component": "RecipeOverviewTab",
            "replaces": "basic",
            "order": 1
        },
        {
            "id": "recipe-details",
            "label": "Recipe",
            "component": "RecipeDetailsTab",
            "replaces": null,
            "order": 2
        },
        {
            "id": "recipe-messages",
            "label": "Messages",
            "component": "RecipeMessagesTab",
            "replaces": null,
            "order": 3
        },
        {
            "id": "arguments",
            "label": "Arguments",
            "component": "RecipeArgumentsTab",
            "replaces": "arguments",
            "order": 4
        }
    ]
}

/**
 * RecipeNodeEditor - Custom node editor specifically for recipe nodes
 * Uses the modular OverviewTab system with custom sections
 * Now includes automatic known brokers computation and storage
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

    // Helper function to get recipe_id and version from node using definition
    const getRecipeParams = useCallback((currentNode: BaseNode) => {
        const recipeIdArg = currentNode.arg_overrides?.find((arg) => arg.name === RECIPE_NODE_DEFINITION.dynamic_broker_arg);
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
        
        // NEW: Always update known brokers when recipe parameters change
        let nodeWithKnownBrokers = updatedNode;
        if (newRecipeId) {
            // Compute and store known brokers in node metadata
            nodeWithKnownBrokers = updateNodeWithKnownBrokers(updatedNode);
            
            // Log the known brokers for debugging and testing
            const knownBrokers = computeKnownBrokers(nodeWithKnownBrokers);
            if (knownBrokers) {
                console.log('✅ RECIPE_NODE_DEFINITION Integration Test - Known brokers generated:', {
                    recipeId: newRecipeId,
                    brokerCount: knownBrokers.runtimeBrokers.length,
                    brokers: knownBrokers.runtimeBrokers.map(b => ({ 
                        id: b.id, 
                        label: b.label,
                        dataType: b.dataType,
                        guaranteed: b.guaranteed 
                    })),
                    definitionUsed: knownBrokers.computationContext?.definitionUsed,
                    globalBrokersCount: knownBrokers.globalBrokers?.length || 0
                });
            } else {
                console.log('❌ RECIPE_NODE_DEFINITION Integration Test - No known brokers generated for recipe:', newRecipeId);
            }
        }
        
        // CRITICAL: Always return the updated node (now with known brokers)
        return nodeWithKnownBrokers;
    }, [currentRecipeId, currentVersion, getRecipeParams, fetchRecipeDetails]);

    // Create a custom OverviewTab component with recipe-specific sections
    const RecipeOverviewTab = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => {
        const wrappedUpdate = useCallback((updatedNode: BaseNode) => {
            // Do our analysis and known brokers update first
            const nodeWithUpdates = handleNodeUpdate(updatedNode);
            // Then call the original update with the enhanced node
            onNodeUpdate(nodeWithUpdates);
        }, [onNodeUpdate]);

        // Map definition custom sections to actual components
        const customSections: { [key: string]: React.ComponentType<any> } = {};
        
        Object.entries(RECIPE_NODE_DEFINITION.custom_sections).forEach(([key, componentName]) => {
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
                node={node}
                onNodeUpdate={wrappedUpdate}
                customSections={customSections}
                argsToHide={RECIPE_NODE_DEFINITION.managed_arguments}
            />
        );
    };

    // Create a custom ArgumentsTab component that hides recipe-specific arguments
    const RecipeArgumentsTab = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => {
        const wrappedUpdate = useCallback((updatedNode: BaseNode) => {
            // Do our analysis and known brokers update first
            const nodeWithUpdates = handleNodeUpdate(updatedNode);
            // Then call the original update with the enhanced node
            onNodeUpdate(nodeWithUpdates);
        }, [onNodeUpdate]);

        return (
            <ArgumentsTab node={node} onNodeUpdate={wrappedUpdate} argsToHide={RECIPE_NODE_DEFINITION.managed_arguments} />
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

    // Enhanced onSave that ensures known brokers are always up to date
    const handleSave = useCallback((nodeToSave: BaseNode) => {
        // Ensure known brokers are computed and stored before saving
        const nodeWithKnownBrokers = updateNodeWithKnownBrokers(nodeToSave);
        
        // Call the original onSave with the enhanced node
        onSave(nodeWithKnownBrokers);
    }, [onSave]);

    const RecipeDefaultNodeEditor = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => {
        // Map definition tab configs to actual components
        const customTabs = RECIPE_NODE_DEFINITION.custom_tabs.map((tabConfig: any) => {
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
        }).filter(Boolean); // Remove any null entries
        
        return (
            <DefaultNodeEditor
                node={node}
                onNodeUpdate={onNodeUpdate}
                customTabs={customTabs}
            />
        );
    };

    return (
        <CustomNodeEditor
            node={node}
            onSave={handleSave} // Use enhanced save handler
            onClose={onClose}
            open={open}
            title={RECIPE_NODE_DEFINITION.editor_title}
            component={RecipeDefaultNodeEditor}
        />
    );
};

export default RecipeNodeEditor;
