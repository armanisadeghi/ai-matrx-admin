"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, ArrowRightLeft } from "lucide-react";
import CategoryNodeSection from "./CategoryNodeSection";
import CategoryNodeOverlay from "./CategoryNodeOverlay";
import { getIconComponent } from "@/components/common/IconResolver";
import { useCombinedFunctionsWithArgs } from "@/lib/redux/entity/hooks/functions-and-args";
import { CATEGORY_DEFINITIONS } from "@/features/workflows-new/utils/nodeStyles";
import { create, saveStateToDb } from "@/lib/redux/workflow-node/thunks";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { WorkflowNodeData } from "@/lib/redux/workflow-node/types";
import RecipeNodeInitializer from "../custom-nodes/recipes/RecipeNodeInitializer";
import { CUSTOM_NODE_REGISTRY } from "../custom-nodes/custom-node-definitions";
import { getNormalizedRegisteredFunctionNode } from "@/features/workflows-new/utils/node-utils";
import SourceInputNodeSettings from "../nodes/source-node/SourceInputNodeSettings";

interface QuickAccessPanelProps {
    workflowId: string;
    onOpenFieldDisplay: () => void;
}

const RECIPE_FUNCTION_ID = "2ac5576b-d1ab-45b1-ab48-4e196629fdd8";

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ workflowId, onOpenFieldDisplay }) => {
    const [isAddingNode, setIsAddingNode] = useState(false);

    const dispatch = useAppDispatch();
    const userId = useAppSelector(selectUserId);

    const [activeCategoryOverlay, setActiveCategoryOverlay] = useState<string | null>(null);
    const [showRecipeInitializer, setShowRecipeInitializer] = useState(false);
    const [showSourceInputCreator, setShowSourceInputCreator] = useState(false);
    const [pendingRecipeNode, setPendingRecipeNode] = useState<{
        nodeData: WorkflowNodeData;
    } | null>(null);

    const { combinedFunctions, fetchAll } = useCombinedFunctionsWithArgs();
    const nodeDefinition = useMemo(() => CUSTOM_NODE_REGISTRY["recipe-node-definition"], []);

    const handleAddNode = async (nodeType: string, functionId?: string) => {
        setIsAddingNode(true);
        try {
            const newNodeData = getNormalizedRegisteredFunctionNode(functionId, workflowId, userId, { x: 0, y: 0 });

            const newNode = await dispatch(create(newNodeData)).unwrap();

            return newNode;
        } catch (error) {
            console.error("Failed to add node:", error);
        } finally {
            setIsAddingNode(false);
            console.log("[QuickAccessPanel] setIsAddingNode(false)");
        }
    };

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
    const handleNodeAdd = async (nodeType: string, functionId?: string) => {
        // Check if this is a recipe node
        if (functionId === RECIPE_FUNCTION_ID) {
            const result = await handleAddNode(nodeType, functionId);

            if (result) {
                console.log("Setting pending recipe node from QuickAccessPanel");
                setPendingRecipeNode({
                    nodeData: result,
                });
                setShowRecipeInitializer(true);
                // Close the category overlay since we're showing the recipe initializer
                closeCategoryOverlay();
            }
        } else {
            // Use normal node addition for all other nodes
            console.log("Adding normal node from QuickAccessPanel");
            handleAddNode(nodeType, functionId);
            // Close overlay after adding normal nodes
            closeCategoryOverlay();
        }
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

    const handleRecipeConfirm = async () => {
        dispatch(saveStateToDb(pendingRecipeNode?.nodeData.id!));
        if (pendingRecipeNode) {
            try {
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

    return (
        <div className="w-32 bg-white dark:bg-gray-800 flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Core System Nodes - Direct access at the top */}
                <div className="px-0 pb-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                            onClick={() => setShowSourceInputCreator(true)}
                            className="flex flex-col items-center gap-1 p-1 pt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] leading-tight text-blue-700 dark:text-blue-300">User Input</span>
                        </button>

                        <button
                            onClick={() => handleNodeAdd("brokerRelay")}
                            className="flex flex-col items-center gap-1 p-1 pt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] leading-tight text-blue-700 dark:text-blue-300">Broker Relay</span>
                        </button>
                    </div>
                </div>

                {/* Categories Section - At the top, no header, no collapsible */}
                <CategoryNodeSection categories={CATEGORY_DEFINITIONS} onCategoryClick={handleCategoryClick} />
            </div>

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

            {/* Recipe Node Initializer - Leave this here and disabled for now */}
            {pendingRecipeNode && (
                <RecipeNodeInitializer
                    nodeId={pendingRecipeNode.nodeData.id}
                    onConfirm={handleRecipeConfirm}
                    onCancel={handleRecipeCancel}
                    open={showRecipeInitializer}
                />
            )}

            {/* Source Input Creator */}
            <SourceInputNodeSettings
                isOpen={showSourceInputCreator}
                onOpenChange={setShowSourceInputCreator}
                workflowId={workflowId}
                mode="create"
            />
        </div>
    );
};

export default QuickAccessPanel;
