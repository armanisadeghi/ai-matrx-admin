"use client";

import React from "react";
import {
    Circle,
    Database,
    User,
    GitBranch,
    MoreHorizontal,
    Layers
} from "lucide-react";
import { Handle, Position } from "reactflow";

// Color palette for different node types
const COLORS = {
    action: {
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        border: "border-indigo-300 dark:border-indigo-700",
        text: "text-indigo-800 dark:text-indigo-200",
        shadow: "shadow-indigo-300/20 dark:shadow-indigo-900/30",
    },
    broker: {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-300 dark:border-amber-700",
        text: "text-amber-800 dark:text-amber-200",
        shadow: "shadow-amber-300/20 dark:shadow-amber-900/30",
    },
    source: {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        border: "border-emerald-300 dark:border-emerald-700",
        text: "text-emerald-800 dark:text-emerald-200",
        shadow: "shadow-emerald-300/20 dark:shadow-emerald-900/30",
    },
    destination: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        border: "border-purple-300 dark:border-purple-700",
        text: "text-purple-800 dark:text-purple-200",
        shadow: "shadow-purple-300/20 dark:shadow-purple-900/30",
    },
    input: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        border: "border-blue-300 dark:border-blue-700",
        text: "text-blue-800 dark:text-blue-200",
    },
    output: {
        bg: "bg-green-100 dark:bg-green-900/30",
        border: "border-green-300 dark:border-green-700",
        text: "text-green-800 dark:text-green-200",
    },
    selected: {
        border: "border-cyan-500 dark:border-cyan-400",
        shadow: "shadow-cyan-400/30 dark:shadow-cyan-300/30",
        ring: "ring-2 ring-cyan-400 dark:ring-cyan-300",
    },
};

// Categories with icons
const CATEGORIES = {
    All: <Layers size={18} />,
    Data: <Database size={18} />,
    AI: <Circle size={18} />,
    Network: <Circle size={18} />,
    Communication: <User size={18} />,
    Logic: <GitBranch size={18} />,
    Database: <Database size={18} />,
    Output: <Circle size={18} />,
};

interface WorkflowNodeProps {
    node: any;
    isSelected: boolean;
    onSelect: (nodeId: string) => void;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({
    node,
    isSelected,
    onSelect
}) => {
    let colorClass = COLORS.action;
    let icon = CATEGORIES[node.category] || <Circle size={18} />;

    if (node.type === "broker") {
        colorClass = COLORS.broker;
        icon = <GitBranch size={18} />;
    } else if (node.type === "source") {
        colorClass = COLORS.source;
        icon = <User size={18} />;
    } else if (node.type === "destination") {
        colorClass = COLORS.destination;
        icon = node.icon || <Database size={18} />;
    }

    return (
        <div
            className={`rounded-lg border shadow-md transition-all ${colorClass.bg} ${colorClass.border} ${
                colorClass.shadow
            }
          ${isSelected ? `${COLORS.selected.border} ${COLORS.selected.shadow} ring-1 ring-cyan-500 shadow-lg` : ""}`}
            style={{
                minWidth: "180px",
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(node.id);
            }}
        >
            <div className={`flex items-center justify-between p-2 border-b ${colorClass.border} ${colorClass.text}`}>
                <div className="flex items-center space-x-2">
                    {icon}
                    <span className="font-medium">{node.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                    {node.type === "action" && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                    <button className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1">
                        <MoreHorizontal size={14} />
                    </button>
                </div>
            </div>

            {/* Inputs */}
            {node.inputs && node.inputs.length > 0 && (
                <div className="px-2 py-1">
                    {node.inputs.map((input: any, idx: number) => (
                        <div key={`input-${idx}`} className="flex items-center my-1 group relative">
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={input.name}
                                className={`!w-3 !h-3 !rounded-full !border !cursor-pointer ${COLORS.input.border} ${COLORS.input.bg} !-ml-1.5 !mr-2 !relative !transform-none`}
                                style={{ position: 'relative', transform: 'none', left: 0, top: 0 }}
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                                {input.name}
                                {input.required ? "*" : ""}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Outputs */}
            {node.outputs && node.outputs.length > 0 && (
                <div className="border-t px-2 py-1 border-gray-200 dark:border-gray-700">
                    {node.outputs.map((output: any, idx: number) => (
                        <div key={`output-${idx}`} className="flex items-center justify-between my-1 group relative">
                            <span className="text-xs text-gray-700 dark:text-gray-300">{output.name}</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={output.name}
                                className={`!w-3 !h-3 !rounded-full !border !cursor-pointer ${COLORS.output.border} ${COLORS.output.bg} !mr-0 !ml-2 !relative !transform-none`}
                                style={{ position: 'relative', transform: 'none', right: 0, top: 0 }}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkflowNode; 