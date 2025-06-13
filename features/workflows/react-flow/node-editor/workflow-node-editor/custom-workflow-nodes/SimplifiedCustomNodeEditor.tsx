"use client";

import React, { useState, useEffect } from "react";
import { DbFunctionNode } from "@/features/workflows/types";

// Import all our centralized utilities
import * as NodeUtils from "../utils";

export interface SimplifiedCustomNodeEditorProps {
    nodeData: DbFunctionNode;
    onSave: (updatedNode: DbFunctionNode) => void;
    onClose: () => void;
    open: boolean;
    children: React.ReactNode;
    autoSave?: boolean;
}

const SimplifiedCustomNodeEditor: React.FC<SimplifiedCustomNodeEditorProps> = ({
    nodeData,
    onSave,
    onClose,
    open,
    children,
    autoSave = false,
}) => {
    const [editingNode, setEditingNode] = useState<DbFunctionNode>(nodeData);

    useEffect(() => {
        setEditingNode(nodeData);
    }, [nodeData]);

    // Create a utilities object that child components can use
    const nodeUtilities = {
        // Pass the current node and update callback to all utility functions
        node: editingNode,
        updateNode: setEditingNode,

        // Basic node updates
        updateStepName: (stepName: string) => {
            setEditingNode({ ...editingNode, step_name: stepName });
        },

        updateFunctionType: (functionType: string) => {
            setEditingNode({ ...editingNode, function_type: functionType });
        },

        updateExecutionRequired: (required: boolean) => {
            setEditingNode({ ...editingNode, execution_required: required });
        },

        // Argument utilities - use our centralized functions
        updateArgOverride: (argName: string, field: keyof import("@/features/workflows/types").ArgumentOverride, value: any) => {
            NodeUtils.updateArgOverride(editingNode, setEditingNode, argName, field, value);
        },

        handleArgValueChange: (arg: any, inputValue: string) => {
            NodeUtils.handleArgValueChange(editingNode, setEditingNode, arg, inputValue);
        },

        addBrokerMapping: (argName: string) => {
            NodeUtils.addBrokerMapping(editingNode, setEditingNode, argName);
        },

        updateBrokerMapping: (index: number, value: string) => {
            NodeUtils.updateBrokerMapping(editingNode, setEditingNode, index, value);
        },

        removeBrokerMapping: (index: number) => {
            NodeUtils.removeBrokerMapping(editingNode, setEditingNode, index);
        },

        // Dependency utilities
        addWorkflowDependency: () => {
            NodeUtils.addWorkflowDependency(editingNode, setEditingNode);
        },

        updateWorkflowDependency: (index: number, field: keyof import("@/features/workflows/types").WorkflowDependency, value: string) => {
            NodeUtils.updateWorkflowDependency(editingNode, setEditingNode, index, field, value);
        },

        removeWorkflowDependency: (index: number) => {
            NodeUtils.removeWorkflowDependency(editingNode, setEditingNode, index);
        },

        // Mapping utilities
        addArgumentMapping: () => {
            NodeUtils.addArgumentMapping(editingNode, setEditingNode);
        },

        updateArgumentMapping: (index: number, field: keyof import("@/features/workflows/types").ArgumentMapping, value: string) => {
            NodeUtils.updateArgumentMapping(editingNode, setEditingNode, index, field, value);
        },

        removeArgumentMapping: (index: number) => {
            NodeUtils.removeArgumentMapping(editingNode, setEditingNode, index);
        },

        // Data helpers - use our centralized functions
        getFunctionData: () => NodeUtils.getFunctionData(editingNode.function_id),
        getEffectiveArgValue: (arg: any) => NodeUtils.getEffectiveArgValue(arg, editingNode.arg_overrides),
        getArgumentsWithData: () => {
            const functionData = NodeUtils.getFunctionData(editingNode.function_id);
            return NodeUtils.getArgumentsWithData(editingNode, functionData);
        },
        getAllReturnBrokers: () => {
            const functionData = NodeUtils.getFunctionData(editingNode.function_id);
            return NodeUtils.getAllReturnBrokers(editingNode, functionData);
        },
        getBrokerMappingsForArg: (argName: string) => NodeUtils.getBrokerMappingsForArg(editingNode, argName),

        // Status helpers
        hasChanges: JSON.stringify(editingNode) !== JSON.stringify(nodeData),
        hasFunctionArguments: () => {
            const functionData = NodeUtils.getFunctionData(editingNode.function_id);
            return NodeUtils.hasFunctionArguments(functionData);
        },
        hasWorkflowDependencies: () => NodeUtils.hasWorkflowDependencies(editingNode),
        hasArgumentMappings: () => NodeUtils.hasArgumentMappings(editingNode),

        // Save functionality
        save: () => {
            onSave(editingNode);
        },

        reset: () => {
            setEditingNode(nodeData);
        },
    };

    // Auto-save functionality
    useEffect(() => {
        if (autoSave && nodeUtilities.hasChanges) {
            const timeoutId = setTimeout(() => {
                onSave(editingNode);
            }, 1000); // Auto-save after 1 second of inactivity

            return () => clearTimeout(timeoutId);
        }
    }, [editingNode, autoSave, onSave]);

    if (!open) return null;

    // Clone children and pass utilities as props
    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { nodeUtilities } as any);
        }
        return child;
    });

    return <div className="custom-node-editor">{childrenWithProps}</div>;
};

export default SimplifiedCustomNodeEditor;
