"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, ArrowRightLeft, Plus } from "lucide-react";
import CollapsibleNodeSection from "./CollapsibleNodeSection";
import NodeSelectionOverlay from "./NodeSelectionOverlay";
import CategoryNodeSection from "./CategoryNodeSection";
import CategoryNodeOverlay from "./CategoryNodeOverlay";
import { getIconComponent } from "@/components/official/IconResolver";
import { useCombinedFunctionsWithArgs } from "@/lib/redux/entity/hooks/functions-and-args";
import { CATEGORY_DEFINITIONS, INTEGRATION_NODES } from "./constants";
import { DbFunctionNode } from "@/features/workflows/types";
import { XYPosition } from "reactflow";
import { RecipeNodeInitializer, CUSTOM_NODE_REGISTRY, NodeDefinitionType } from "@/features/workflows/react-flow/node-editor";

interface QuickAccessPanelProps {
    onAddNode: (id: string, type?: string) => void;
    onAddCustomNode: (id: string, type?: string) => Promise<{ nodeData: Omit<DbFunctionNode, "user_id">; position: XYPosition } | null | void>;
    onFinalizeNode: (configuredNodeData: Omit<DbFunctionNode, "user_id"> | DbFunctionNode, position: XYPosition) => void;
}

const RECIPE_FUNCTION_ID = "2ac5576b-d1ab-45b1-ab48-4e196629fdd8";

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ onAddNode, onAddCustomNode, onFinalizeNode }) => {
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [activeCategoryOverlay, setActiveCategoryOverlay] = useState<string | null>(null);
    const [showRecipeInitializer, setShowRecipeInitializer] = useState(false);
    const [pendingRecipeNode, setPendingRecipeNode] = useState<{
        nodeData: Omit<DbFunctionNode, "user_id">;
        position: XYPosition;
        nodeDefinition: NodeDefinitionType;
    } | null>(null);

    const { combinedFunctions, fetchAll } = useCombinedFunctionsWithArgs();
    const nodeDefinition = useMemo(() => CUSTOM_NODE_REGISTRY["recipe-node-definition"], []);

    useEffect(() => {
        // Only fetch if no data exists (backup fetch)
        if (combinedFunctions.length === 0) {
            fetchAll();
        }
    }, [combinedFunctions.length]);

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategoryOverlay(categoryId);
    };

    const closeCategoryOverlay = () => {
        setActiveCategoryOverlay(null);
    };

    // Unified node addition handler that manages recipe nodes
    const handleNodeAdd = async (id: string, type?: string) => {
        // Check if this is a recipe node
        if (type === "registeredFunction" && id === RECIPE_FUNCTION_ID) {
            console.log("Adding recipe node from QuickAccessPanel");
            const result = await onAddCustomNode(id, type);
            console.log("Recipe result:", result);

            if (result) {
                console.log("Setting pending recipe node from QuickAccessPanel");
                setPendingRecipeNode({
                    ...result,
                    nodeDefinition,
                });
                setShowRecipeInitializer(true);
                // Close the category overlay since we're showing the recipe initializer
                closeCategoryOverlay();
            }
        } else {
            // Use normal node addition for all other nodes
            console.log("Adding normal node from QuickAccessPanel");
            onAddNode(id, type);
            // Close overlay after adding normal nodes
            closeCategoryOverlay();
        }
    };

    const handleRecipeConfirm = async (configuredNodeData: Omit<DbFunctionNode, "user_id">) => {
        if (pendingRecipeNode) {
            try {
                onFinalizeNode(configuredNodeData, pendingRecipeNode.position);
                setShowRecipeInitializer(false);
                setPendingRecipeNode(null);
            } catch (error) {
                console.error("Error finalizing recipe node:", error);
            }
        }
    };

    const handleRecipeCancel = () => {
        setShowRecipeInitializer(false);
        setPendingRecipeNode(null);
    };

    // Helper function to normalize category names
    const normalizeCategoryName = (category: string): string => {
        if (!category) return "other";
        const normalized = category.toLowerCase();
        const validCategories = CATEGORY_DEFINITIONS.map((cat) => cat.id);
        return validCategories.includes(normalized) ? normalized : "other";
    };

    // Generate category nodes from registered functions
    const getCategoryNodes = (categoryId: string) => {
        return combinedFunctions
            .filter((func) => normalizeCategoryName(func.category) === categoryId)
            .map((func) => ({
                id: func.id,
                name: func.name,
                description: func.nodeDescription || func.description?.slice(0, 200) + "..." || "No description available",
                icon: getIconComponent(func.icon),
            }));
    };

    const getCategoryTitle = (categoryId: string) => {
        const categoryDef = CATEGORY_DEFINITIONS.find((def) => def.id === categoryId);
        return categoryDef?.title || categoryDef?.label || categoryId;
    };

    return (
        <div className="w-40 bg-textured flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Core System Nodes - Direct access at the top */}
                <div className="px-0 pb-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onAddNode("userInput", "userInput")}
                            className="flex flex-col items-center gap-2 p-1 pt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-700 dark:text-blue-300">User Input</span>
                        </button>

                        <button
                            onClick={() => onAddNode("brokerRelay", "brokerRelay")}
                            className="flex flex-col items-center gap-2 p-1 pt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-700 dark:text-blue-300">Broker Relay</span>
                        </button>
                    </div>
                </div>

                {/* Categories Section - At the top, no header, no collapsible */}
                <CategoryNodeSection categories={CATEGORY_DEFINITIONS} onCategoryClick={handleCategoryClick} />

                {/* Integration Nodes */}
                {/* <CollapsibleNodeSection title="Integrations" nodes={INTEGRATION_NODES} onAddNode={onAddNode} defaultExpanded={false} /> */}
            </div>

            {/* Floating Action Button */}
            {/* <div className="p-2 border-t border-border">
                <button
                    onClick={() => setIsOverlayOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transform hover:scale-[1.02]"
                >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Browse Nodes</span>
                </button>
            </div> */}

            {/* Node Selection Overlay */}
            <NodeSelectionOverlay
                title="Add Integration Node"
                nodes={INTEGRATION_NODES}
                onAddNode={onAddNode}
                onClose={() => setIsOverlayOpen(false)}
                isOpen={isOverlayOpen}
            />

            {/* Category Overlays */}
            {CATEGORY_DEFINITIONS.map((category) => (
                <CategoryNodeOverlay
                    key={category.id}
                    title={getCategoryTitle(category.id)}
                    categoryId={category.id}
                    nodes={getCategoryNodes(category.id)}
                    onAddNode={handleNodeAdd}
                    onClose={closeCategoryOverlay}
                    isOpen={activeCategoryOverlay === category.id}
                />
            ))}

            {/* Recipe Node Initializer */}
            {pendingRecipeNode && (
                <RecipeNodeInitializer
                    nodeData={pendingRecipeNode.nodeData as DbFunctionNode}
                    nodeDefinition={pendingRecipeNode.nodeDefinition}
                    onConfirm={handleRecipeConfirm}
                    onCancel={handleRecipeCancel}
                    open={showRecipeInitializer}
                />
            )}
        </div>
    );
};

export default QuickAccessPanel;
