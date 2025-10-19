"use client";

import React from "react";
import { X } from "lucide-react";
import { DynamicIcon } from "@/components/common/IconResolver";
import { CategoryNodeData } from "@/features/workflows-xyflow/hooks/useCategoryNodeData";

interface CategoryRecord {
    id: string;
    label?: string;
    icon?: string;
    color?: string;
    description?: string;
}

interface NodeSelectionOverlayProps {
    category: CategoryRecord;
    nodesByCategory: Record<string, CategoryNodeData[]>;
    onAddNode: (functionId: string) => void;
    onClose: () => void;
    isOpen: boolean;
}

const NodeSelectionOverlay: React.FC<NodeSelectionOverlayProps> = ({ category, nodesByCategory, onAddNode, onClose, isOpen }) => {
    const nodes = nodesByCategory[category.id] || [];
    const title = category.label || category.id;

    const handleNodeClick = (node: CategoryNodeData) => {
        onAddNode(node.id);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 border border-red-500" onClick={handleBackdropClick}>
            <div className="bg-textured rounded-2xl shadow-2xl max-w-7xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                    {nodes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {nodes.map((node) => {
                                return (
                                    <button
                                        key={node.id}
                                        onClick={() => handleNodeClick(node)}
                                        className="group p-4 bg-white dark:bg-gray-700/50 border border-blue-200 dark:border-blue-800/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 text-left h-full flex flex-col"
                                    >
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className={`p-2 bg-${node.color}-50 dark:bg-${node.color}-900/30 rounded-lg border border-${node.color}-200 dark:border-${node.color}-700 group-hover:bg-${node.color}-100 dark:group-hover:bg-${node.color}-800/40 transition-all duration-200 flex-shrink-0`}>
                                                <DynamicIcon name={node.icon} color={node.color} size={5} />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <h3 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">
                                                    {node.name}
                                                </h3>
                                                {node.description && (
                                                    <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed line-clamp-4">
                                                        {node.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No {title} Available Yet</h3>
                            <p className="text-gray-500 dark:text-gray-400">{title} will appear here when they're added to the system.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {nodes.length > 0
                                ? `Choose a Node from '${title}' to add to your workflow`
                                : `${title} will be available here soon`}
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NodeSelectionOverlay;