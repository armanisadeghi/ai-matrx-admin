"use client";

import React from "react";
import { GenericContextMenu } from "@/components/ui/menu-system";
import { WorkflowNodeMenuProps } from "@/features/workflows/components/menus/WorkflowNodeMenuDefinition";

// Import the menu definition to ensure it's registered
import "@/features/workflows/components/menus/WorkflowNodeMenuDefinition";

interface NodeContextMenuProps extends WorkflowNodeMenuProps {
    children: React.ReactNode;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
    children,
    ...menuProps
}) => {
    return (
        <GenericContextMenu 
            menuId="workflow-node"
            menuProps={menuProps}
        >
            {children}
        </GenericContextMenu>
    );
}; 