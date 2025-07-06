"use client";

import React, { useState, useEffect } from "react";
import { LucideIcon } from "lucide-react";
import NodeSelectionOverlay from "./NodeSelectionOverlay";
import { getIconComponent } from "@/components/common/IconResolver";
import { useCombinedFunctionsWithArgs } from "@/lib/redux/entity/hooks/functions-and-args";
import { CATEGORY_DEFINITIONS } from "@/features/workflows-xyflow/utils/nodeStyles";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getNormalizedRegisteredFunctionNode } from "@/features/workflows-xyflow/utils/node-utils";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";
import { createWorkflowNode } from "@/lib/redux/workflow-nodes/thunks";


interface CategoryNodeSectionProps {
    workflowId: string;
    onRecipeNodeCreated?: (nodeData: WorkflowNode) => void;
}

const RECIPE_FUNCTION_ID = "2ac5576b-d1ab-45b1-ab48-4e196629fdd8";

const CategoryNodeSection: React.FC<CategoryNodeSectionProps> = ({
    workflowId,
    onRecipeNodeCreated,
}) => {
    const [activeCategoryOverlay, setActiveCategoryOverlay] = useState<string | null>(null);
    const [isAddingNode, setIsAddingNode] = useState(false);

    const dispatch = useAppDispatch();
    const userId = useAppSelector(selectUserId);
    const { combinedFunctions, fetchAll } = useCombinedFunctionsWithArgs();

    useEffect(() => {
        // Only fetch if no data exists (backup fetch)
        if (combinedFunctions.length === 0) {
            fetchAll();
        }
    }, [combinedFunctions.length]);

    const handleAddWorkflowNode = async (functionId: string) => {
        setIsAddingNode(true);
        try {
            const newNodeData = getNormalizedRegisteredFunctionNode("workflowNode", functionId, workflowId, userId);
            const newNode = await dispatch(createWorkflowNode(newNodeData)).unwrap();
            return newNode;
        } catch (error) {
            console.error("Failed to add node:", error);
        } finally {
            setIsAddingNode(false);
        }
    };

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategoryOverlay(categoryId);
    };

    const closeCategoryOverlay = () => {
        setActiveCategoryOverlay(null);
    };

    const handleNodeAdd = async (functionId: string) => {
        // Check if this is a recipe node
        if (functionId === RECIPE_FUNCTION_ID) {
            const result = await handleAddWorkflowNode(functionId);
            if (result && onRecipeNodeCreated) {
                onRecipeNodeCreated(result);
            }
            closeCategoryOverlay();
        } else {
            handleAddWorkflowNode(functionId);
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

    return (
        <>
            <div className="px-0 pb-4">
                <div className={`grid grid-cols-2 gap-2`}>
                    {CATEGORY_DEFINITIONS.map((category) => {
                        const IconComponent = category.icon;
                        return (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryClick(category.id)}
                                className="flex flex-col items-center gap-1 p-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                disabled={isAddingNode}
                            >
                                <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-[10px] leading-tight text-gray-700 dark:text-gray-300">{category.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Category Overlays */}
            {CATEGORY_DEFINITIONS.map((category) => (
                <NodeSelectionOverlay
                    key={category.id}
                    title={getCategoryTitle(category.id)}
                    categoryId={category.id}
                    nodes={getCategoryNodes(category.id)}
                    onAddNode={handleNodeAdd}
                    onClose={closeCategoryOverlay}
                    isOpen={activeCategoryOverlay === category.id}
                />
            ))}
        </>
    );
};

export default CategoryNodeSection; 