"use client";

import React, { useState } from "react";

import NodeSelectionOverlay from "./NodeSelectionOverlay";
import { useCategoryNodeData } from "@/features/workflows-xyflow/hooks/useCategoryNodeData";
import { getIconComponent } from "@/components/official/IconResolver";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";

interface CategoryNodeSectionProps {
    workflowId: string;
    onRecipeNodeCreated?: (nodeData: WorkflowNode) => void;
}

const CategoryNodeSection: React.FC<CategoryNodeSectionProps> = ({ workflowId, onRecipeNodeCreated }) => {
    // Use shared hook with all the node creation functionality
    const { categoryRecords, nodesByCategory, handleNodeAdd, isAddingNode } = useCategoryNodeData(workflowId);

    const [activeCategoryOverlay, setActiveCategoryOverlay] = useState<string | null>(null);

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategoryOverlay(categoryId);
    };

    const closeCategoryOverlay = () => {
        setActiveCategoryOverlay(null);
    };

    const handleNodeAddWrapper = async (nodeId: string) => {
        try {
            const result = await handleNodeAdd(nodeId, workflowId, onRecipeNodeCreated);
            closeCategoryOverlay();
            return result;
        } catch (error) {
            console.error("Failed to add node:", error);
        }
    };



    return (
        <>
            <div className="px-0 pb-4">
                <div className={`grid grid-cols-2 gap-2`}>
                    {Object.values(categoryRecords).map((category) => {
                        const IconComponent = getIconComponent(category.icon);
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
            {Object.values(categoryRecords).map((category) => (
                <NodeSelectionOverlay
                    key={category.id}
                    category={category}
                    nodesByCategory={nodesByCategory}
                    onAddNode={handleNodeAddWrapper}
                    onClose={closeCategoryOverlay}
                    isOpen={activeCategoryOverlay === category.id}
                />
            ))}
        </>
    );
};

export default CategoryNodeSection;
