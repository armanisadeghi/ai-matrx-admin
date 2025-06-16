"use client";

import React from "react";
import { Edit, Copy, Trash2, Play, Eye } from "lucide-react";
import { MenuDefinition, MenuItemDefinition } from "@/components/ui/menu-system/types";
import { MenuRegistry } from "@/components/ui/menu-system/MenuRegistry";
import { DbFunctionNode, DbUserInput, DbNodeData, DbBrokerRelayData } from "@/features/workflows/types";

interface WorkflowNodeMenuProps {
    data: DbNodeData;
    userInputs?: Array<{ broker_id: string; default_value: any, value?: any }>;
    onDuplicate?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onExecuteComplete?: (taskId: string) => void;
    onExecuteError?: (error: string) => void;
    onShowResults?: (nodeData: DbFunctionNode) => void;
    onEditFunctionNode?: (nodeData: DbFunctionNode) => void;
    onEditUserInput?: (nodeData: DbUserInput) => void;
    onEditRelay?: (nodeData: DbBrokerRelayData) => void;
}

// Define all possible menu items declaratively
const menuItemDefinitions = [
    {
        id: "edit-function-node",
        icon: React.createElement(Edit, { className: "h-4 w-4 mr-2" }),
        label: "Edit",
        handlerKey: "onEditFunctionNode" as keyof WorkflowNodeMenuProps,
        onClick: (props: WorkflowNodeMenuProps) => props.onEditFunctionNode!(props.data as DbFunctionNode),
    },
    {
        id: "edit-user-input",
        icon: React.createElement(Edit, { className: "h-4 w-4 mr-2" }),
        label: "Edit",
        handlerKey: "onEditUserInput" as keyof WorkflowNodeMenuProps,
        onClick: (props: WorkflowNodeMenuProps) => props.onEditUserInput!(props.data as DbUserInput),
    },
    {
        id: "edit-relay",
        icon: React.createElement(Edit, { className: "h-4 w-4 mr-2" }),
        label: "Edit",
        handlerKey: "onEditRelay" as keyof WorkflowNodeMenuProps,
        onClick: (props: WorkflowNodeMenuProps) => props.onEditRelay!(props.data as DbBrokerRelayData),
    },
    {
        id: "show-results",
        icon: React.createElement(Eye, { className: "h-4 w-4 mr-2" }),
        label: "Show Results",
        handlerKey: "onShowResults" as keyof WorkflowNodeMenuProps,
        onClick: (props: WorkflowNodeMenuProps) => props.onShowResults!(props.data as DbFunctionNode),
    },
    {
        id: "execute",
        icon: React.createElement(Play, { className: "h-4 w-4 mr-2" }),
        label: "Execute Step",
        handlerKey: "onExecuteComplete" as keyof WorkflowNodeMenuProps,
        onClick: (props: WorkflowNodeMenuProps) => {
            console.log("Execute clicked - should be handled by component");
        },
    },
    {
        id: "duplicate",
        icon: React.createElement(Copy, { className: "h-4 w-4 mr-2" }),
        label: "Duplicate",
        handlerKey: "onDuplicate" as keyof WorkflowNodeMenuProps,
        onClick: (props: WorkflowNodeMenuProps) => props.onDuplicate!(props.data.id),
    },
    {
        id: "delete",
        icon: React.createElement(Trash2, { className: "h-4 w-4 mr-2" }),
        label: "Delete",
        handlerKey: "onDelete" as keyof WorkflowNodeMenuProps,
        onClick: (props: WorkflowNodeMenuProps) => props.onDelete!(props.data.id),
        destructive: true,
    },
];

// Simple helper to create menu items - just filter and map
function createWorkflowNodeItems(props: WorkflowNodeMenuProps): MenuItemDefinition[] {
    return menuItemDefinitions
        .filter(item => !!props[item.handlerKey])
        .map(item => ({
            id: item.id,
            icon: item.icon,
            label: item.label,
            onClick: () => item.onClick(props),
            ...(item.destructive && { destructive: true }),
        }));
}

// Define the workflow node menu
const workflowNodeMenuDefinition: MenuDefinition = {
    id: "workflow-node",
    name: "Workflow Node Menu",
    customItems: (props: WorkflowNodeMenuProps) => createWorkflowNodeItems(props),
    // Show all global items by default
    hideProfile: false,
    hideTheme: false,
    hideLogout: false,
};

// Register the menu
MenuRegistry.register(workflowNodeMenuDefinition);

export { workflowNodeMenuDefinition };
export type { WorkflowNodeMenuProps }; 