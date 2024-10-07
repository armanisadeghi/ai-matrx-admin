'use client';

import React from "react";
import {Edit, Eye, Maximize2, Trash} from "lucide-react";
import MatrxTooltip from "@/components/matrx/MatrxTooltip";
import {Button} from "@/components/ui/button";
import {TableData, ActionDefinition} from "./table.types";

export const actionDefinitions: Record<string, ActionDefinition> = {
    edit: {
        name: 'edit',
        label: "Edit this item",
        icon: <Edit className="h-3 w-3"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
    },
    delete: {
        name: 'delete',
        label: "Delete this item",
        icon: <Trash className="h-4 w-4"/>,
        className: "text-destructive hover:bg-destructive hover:text-destructive-foreground",
    },
    view: {
        name: 'view',
        label: "View this item",
        icon: <Eye className="h-4 w-4"/>,
        className: "text-primary hover:bg-secondary hover:text-secondary-foreground",
    },
    expand: {
        name: 'expand',
        label: "Expand view",
        icon: <Maximize2 className="h-4 w-4"/>,
        className: "text-secondary hover:bg-secondary hover:text-secondary-foreground",
    },
};

export const TableActionIcon: React.FC<{
    actionName: string;
    data: TableData;
    onAction: (actionName: string, data: TableData) => void;
}> = ({actionName, data, onAction}) => {
    const action = actionDefinitions[actionName];
    if (!action) return null;

    const {name, label, icon, className} = action;

    return (
        <MatrxTooltip content={label} placement="left">
            <Button
                onClick={(e) => {
                    e.stopPropagation();
                    onAction(name, data);
                }}
                size="xs"
                variant="ghost"
                className={`p-1 ${className || "transition-all duration-300 hover:scale-105"}`}
            >
                {React.cloneElement(icon as React.ReactElement, {className: 'w-3 h-3'})}
            </Button>
        </MatrxTooltip>
    );
};

