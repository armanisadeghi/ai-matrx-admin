"use client";

import React from "react";
import { BaseNode, NodeConfig } from "./BaseNode";
import { NodeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";

const DefaultNodeContent: React.FC<{ nodeData: any }> = ({ nodeData }) => {
    const nodeType = nodeData?.type || "unknown";
    const nodeId = nodeData?.id || "unknown";
    const actualNodeType = nodeData?.metadata?.nodeDefinition?.type || "unknown";
    
    return (
        <div className="p-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Default Node
                </span>
            </div>
            <div className="text-xs text-red-600 dark:text-red-300 space-y-1">
                <div><strong>Type:</strong> {nodeType}</div>
                <div><strong>ID:</strong> {nodeId}</div>
                {actualNodeType !== "unknown" && (
                    <div><strong>Actual:</strong> {actualNodeType}</div>
                )}
            </div>
            <div className="mt-2 text-xs text-red-500 dark:text-red-400 italic">
                Node not properly configured
            </div>
        </div>
    );
};

export const DefaultNode: React.FC<NodeProps<any>> = (props) => {
    console.log("DefaultNode", props.data);
    
    const defaultConfig: NodeConfig = {
        nodeType: "default",
        displayText: "Default Node",
        isValidConnection: () => true, // Allow any connection for debugging
        SettingsComponent: undefined, // Keep it simple for now
        useWorkflowActions: false, // Don't use workflow actions for unknown nodes
        allowCompactMode: false, // Don't allow compact mode for debugging clarity
        DetailedContent: () => <DefaultNodeContent nodeData={props.data} />,
        customStyles: {
            // Red styling for visibility
            cardClass: "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600",
            headerClass: "bg-red-100 dark:bg-red-800/30 border-red-300 dark:border-red-600",
            contentClass: "bg-red-50 dark:bg-red-900/20",
            footerClass: "bg-red-100 dark:bg-red-800/30 border-red-300 dark:border-red-600",
        }
    };

    return <BaseNode config={defaultConfig} {...props} />;
}; 