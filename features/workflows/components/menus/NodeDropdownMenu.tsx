"use client";

import React from "react";
import { GenericDropdownMenu } from "@/components/ui/menu-system";
import { WorkflowNodeMenuProps } from "@/features/workflows/components/menus/WorkflowNodeMenuDefinition";

// Import the menu definition to ensure it's registered
import "@/features/workflows/components/menus/WorkflowNodeMenuDefinition";

interface NodeDropdownMenuProps extends WorkflowNodeMenuProps {
    children: React.ReactNode;
}

export const NodeDropdownMenu: React.FC<NodeDropdownMenuProps> = ({
    children,
    ...menuProps
}) => {
    return (
        <GenericDropdownMenu 
            menuId="workflow-node"
            menuProps={menuProps}
        >
            {children}
        </GenericDropdownMenu>
    );
}; 