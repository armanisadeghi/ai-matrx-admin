"use client";

import React, { useState } from "react";
import { User } from "lucide-react";
import CategoryNodeSection from "./CategoryNodeSection";
import RecipeNodeInitializer from "../custom-nodes/recipes/RecipeNodeInitializer";
import SourceTypeSelector from "../nodes/source-node/SourceTypeSelector";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { saveWorkflowNode } from "@/lib/redux/workflow-nodes/thunks";

interface QuickAccessPanelProps {
    workflowId: string;
    onOpenFieldDisplay: () => void;
}

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ workflowId, onOpenFieldDisplay }) => {
    const [showRecipeInitializer, setShowRecipeInitializer] = useState(false);
    const [showSourceInputCreator, setShowSourceInputCreator] = useState(false);
    const [pendingRecipeNode, setPendingRecipeNode] = useState<{
        nodeData: WorkflowNode;
    } | null>(null);

    const dispatch = useAppDispatch();

    const handleRecipeNodeCreated = (nodeData: WorkflowNode) => {
        console.log("Setting pending recipe node from QuickAccessPanel");
        setPendingRecipeNode({ nodeData });
        setShowRecipeInitializer(true);
    };

    const handleRecipeConfirm = async () => {
        if (pendingRecipeNode) {
            try {
                dispatch(saveWorkflowNode({ id: pendingRecipeNode.nodeData.id }));
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
                            <span className="text-[10px] leading-tight text-blue-700 dark:text-blue-300">Input Source</span>
                        </button>
                    </div>
                </div>

                {/* Categories Section - Self-contained component */}
                <CategoryNodeSection 
                    workflowId={workflowId}
                    onRecipeNodeCreated={handleRecipeNodeCreated}
                />
            </div>

            {/* Recipe Node Initializer */}
            {pendingRecipeNode && (
                <RecipeNodeInitializer
                    nodeId={pendingRecipeNode.nodeData.id}
                    onConfirm={handleRecipeConfirm}
                    onCancel={handleRecipeCancel}
                    open={showRecipeInitializer}
                />
            )}

            {/* Source Input Creator */}
            <SourceTypeSelector
                isOpen={showSourceInputCreator}
                onOpenChange={setShowSourceInputCreator}
                workflowId={workflowId}
                mode="create"
            />
        </div>
    );
};

export default QuickAccessPanel;
