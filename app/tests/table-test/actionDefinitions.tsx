// File: ActionDefinitions.tsx

import { Edit, Eye, Maximize2, Trash } from "lucide-react";
import React from "react";

export const editAction = {
    name: 'edit',
    label: "Edit this item",
    icon: <Edit className="h-3 w-3"/>,
    className: "text-primary hover:bg-primary hover:text-primary-foreground",
};

export const deleteAction = {
    name: 'delete',
    label: "Delete this item",
    icon: <Trash className="h-4 w-4" />,
    className: "text-destructive hover:bg-destructive hover:text-destructive-foreground",
};

export const viewAction = {
    name: 'view',
    label: "View this item",
    icon: <Eye className="h-4 w-4" />,
    className: "text-secondary hover:bg-secondary hover:text-secondary-foreground",
};

export const expandAction = {
    name: 'expand',
    label: "Expand view",
    icon: <Maximize2 className="h-4 w-4" />,
    className: "text-secondary hover:bg-secondary hover:text-secondary-foreground",
};
