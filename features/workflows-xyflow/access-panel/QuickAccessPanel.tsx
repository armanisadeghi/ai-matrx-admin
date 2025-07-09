"use client";

import React from "react";
import { User } from "lucide-react";
import CategoryNodeSection from "./CategoryNodeSection";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";

interface QuickAccessPanelProps {
    workflowId: string;
    onRecipeNodeCreated?: (nodeData: WorkflowNode) => void;
    onOpenSourceInputCreator?: () => void;
}

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ 
    workflowId, 
    onRecipeNodeCreated,
    onOpenSourceInputCreator
}) => {
    return (
        <div className="w-32 bg-white dark:bg-gray-800 flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Core System Nodes - Direct access at the top */}
                <div className="px-0 pb-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                            onClick={() => onOpenSourceInputCreator?.()}
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
                    onRecipeNodeCreated={onRecipeNodeCreated}
                />
            </div>
        </div>
    );
};

export default QuickAccessPanel;
