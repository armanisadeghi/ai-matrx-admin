"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DbFunctionNode, WorkflowNodePersistShape } from "@/features/workflows/types";

// Import all our centralized utilities
import * as NodeUtils from "../utils";
import { asArgumentOverrides } from "@/features/workflows/utils/workflow-json-fields";

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

  // NodeUtils helpers accept WorkflowNodePersistShape (DbFunctionNode |
  // WorkflowNodeInsert). setState is typed to DbFunctionNode — the editor's
  // current state is always a full saved row — so wrap the dispatcher to
  // accept the wider input and cast on the way in.
  const applyPersistShape = useCallback(
    (next: WorkflowNodePersistShape) => {
      setEditingNode(next as DbFunctionNode);
    },
    [],
  );

  // Create a utilities object that child components can use
  const nodeUtilities = {
    // Pass the current node and update callback to all utility functions
    node: editingNode,
    updateNode: applyPersistShape,

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
    updateArgOverride: (
      argName: string,
      field: keyof import("@/features/workflows/types").ArgumentOverride,
      value: any,
    ) => {
      NodeUtils.updateArgOverride(
        editingNode,
        applyPersistShape,
        argName,
        field,
        value,
      );
    },

    handleArgValueChange: (arg: any, inputValue: string) => {
      NodeUtils.handleArgValueChange(
        editingNode,
        applyPersistShape,
        arg,
        inputValue,
      );
    },

    addBrokerMapping: (argName: string) => {
      NodeUtils.addBrokerMapping(editingNode, applyPersistShape, argName);
    },

    updateBrokerMapping: (index: number, value: string) => {
      NodeUtils.updateBrokerMapping(editingNode, applyPersistShape, index, value);
    },

    removeBrokerMapping: (index: number) => {
      NodeUtils.removeBrokerMapping(editingNode, applyPersistShape, index);
    },

    // Dependency utilities
    addWorkflowDependency: () => {
      NodeUtils.addWorkflowDependency(editingNode, applyPersistShape);
    },

    updateWorkflowDependency: (
      index: number,
      field: keyof import("@/features/workflows/types").WorkflowDependency,
      value: string,
    ) => {
      NodeUtils.updateWorkflowDependency(
        editingNode,
        applyPersistShape,
        index,
        field,
        value,
      );
    },

    removeWorkflowDependency: (index: number) => {
      NodeUtils.removeWorkflowDependency(editingNode, applyPersistShape, index);
    },

    // Mapping utilities
    addArgumentMapping: () => {
      NodeUtils.addArgumentMapping(editingNode, applyPersistShape);
    },

    updateArgumentMapping: (
      index: number,
      field: keyof import("@/features/workflows/types").ArgumentMapping,
      value: string,
    ) => {
      NodeUtils.updateArgumentMapping(
        editingNode,
        applyPersistShape,
        index,
        field,
        value,
      );
    },

    removeArgumentMapping: (index: number) => {
      NodeUtils.removeArgumentMapping(editingNode, applyPersistShape, index);
    },

    // Data helpers - use our centralized functions
    getFunctionData: () => NodeUtils.getFunctionData(editingNode.function_id),
    getEffectiveArgValue: (arg: any) =>
      NodeUtils.getEffectiveArgValue(
        arg,
        asArgumentOverrides(editingNode.arg_overrides),
      ),
    getArgumentsWithData: () => {
      const functionData = NodeUtils.getFunctionData(editingNode.function_id);
      return NodeUtils.getArgumentsWithData(editingNode, functionData);
    },
    getAllReturnBrokers: () => {
      const functionData = NodeUtils.getFunctionData(editingNode.function_id);
      return NodeUtils.getAllReturnBrokers(editingNode, functionData);
    },
    getBrokerMappingsForArg: (argName: string) =>
      NodeUtils.getBrokerMappingsForArg(editingNode, argName),

    // Status helpers
    hasChanges: JSON.stringify(editingNode) !== JSON.stringify(nodeData),
    hasFunctionArguments: () => {
      const functionData = NodeUtils.getFunctionData(editingNode.function_id);
      return NodeUtils.hasFunctionArguments(functionData);
    },
    hasWorkflowDependencies: () =>
      NodeUtils.hasWorkflowDependencies(editingNode),
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
