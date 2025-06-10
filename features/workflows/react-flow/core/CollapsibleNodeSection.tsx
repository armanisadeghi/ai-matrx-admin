"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";

interface NodeDefinition {
    id: string;
    type?: string;
    icon: LucideIcon;
    label: string;
}

interface CollapsibleNodeSectionProps {
    title: string;
    nodes: NodeDefinition[];
    onAddNode: (id: string, type?: string) => void;
    defaultExpanded?: boolean;
    columns?: number;
}

const CollapsibleNodeSection: React.FC<CollapsibleNodeSectionProps> = ({
    title,
    nodes,
    onAddNode,
    defaultExpanded = false,
    columns = 2,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleNodeClick = (node: NodeDefinition) => {
        onAddNode(node.id, node.type);
    };

    return (
        <div className="px-4 pb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between mb-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md p-2 -m-2 transition-colors"
            >
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
            </button>

            {isExpanded && (
                <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {nodes.map((node) => {
                        const IconComponent = node.icon;
                        return (
                            <button
                                key={node.id}
                                onClick={() => handleNodeClick(node)}
                                className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                                <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                <span className="text-xs text-gray-700 dark:text-gray-300">{node.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CollapsibleNodeSection; 