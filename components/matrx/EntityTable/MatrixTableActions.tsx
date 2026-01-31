'use client';

import * as React from "react";
import MatrxTooltip from "@/components/matrx/MatrxTooltip";
import { Button, buttonVariants} from "@/components/ui/button";
import {TableData} from "@/types/entityTableTypes";
import { type VariantProps } from "class-variance-authority";
import {
    Edit,
    Trash,
    Eye,
    Maximize2,
    Plus,
    Copy,
    Download,
    Upload,
    RefreshCw,
    Archive,
    MoreHorizontal,
    Filter,
    Search,
    Save,
    X,
    CheckCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {CommandContext, TableCommandConfig, TableCommandContext} from "@/components/matrx/MatrxCommands/types";


function createTableCommand<TData = TableData>(
    config: TableCommandConfig<TData>
) {
    const TableCommandComponent: React.FC<{
        data: TData;
        rowId?: string | number;
        tableId?: string;
        selectedRows?: (string | number)[];
        className?: string;
        onExecute?: (context: TableCommandContext<TData>) => Promise<void>;
    }> = ({
              data,
              rowId,
              tableId,
              selectedRows,
              className,
              onExecute
          }) => {
        // Create context
        const context: TableCommandContext<TData> = {
            type: config.type,
            scope: config.scope,
            data,
            rowId,
            tableId,
            selectedRows,
            status: 'idle'
        };

        // Compute states
        const isVisible = config.isVisible?.(context) ?? true;
        const isEnabled = config.isEnabled?.(context) ?? true;

        // Handle execution
        const handleClick = async (e: React.MouseEvent) => {
            e.stopPropagation();
            context.status = 'loading';

            try {
                if (onExecute) {
                    await onExecute(context);
                } else if (config.onExecuteTable) {
                    await config.onExecuteTable(context);
                }
                context.status = 'success';
            } catch (error) {
                context.status = 'error';
                if (config.onErrorTable) {
                    config.onErrorTable(error as Error, context);
                } else if (config.onError) {
                    config.onError(error as Error, context as CommandContext);
                }
            }
        };

        if (!isVisible) return null;

        return (
            <MatrxTooltip content={config.label} placement="left">
                <Button
                    onClick={handleClick}
                    size={(config.size || "sm") as "default" | "sm" | "lg" | "icon"}
                    variant={config.variant || "ghost"}
                    disabled={!isEnabled}
                    className={cn(
                        "transition-all duration-300 hover:scale-105",
                        !isEnabled && "cursor-not-allowed",
                        config.className,
                        className
                    )}
                >
                    {React.isValidElement(config.icon) &&
                        React.cloneElement<any>(config.icon, {
                            className: cn(
                                "w-3 h-3",
                                (config.icon.props as any).className
                            )
                        })
                    }
                </Button>
            </MatrxTooltip>
        );
    };

    return TableCommandComponent;
}




export const tableCommands = {
    create: createTableCommand<TableData>({
        name: 'create',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Create new item",
        icon: <Plus className="h-4 w-4"/>,
        className: "text-success hover:bg-success hover:text-success-foreground",

        isEnabled: () => true,
        onExecuteTable: async (context) => {
            console.log('Creating new item');
        }
    }),

    duplicate: createTableCommand<TableData>({
        name: 'duplicate',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Duplicate this item",
        icon: <Copy className="h-4 w-4"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Duplicating:', context.data);
        }
    }),

    // Read actions
    view: createTableCommand<TableData>({
        name: 'view',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "View this item",
        icon: <Eye className="h-4 w-4"/>,
        className: "text-primary hover:bg-secondary hover:text-secondary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Viewing:', context.data);
        }
    }),

    expand: createTableCommand<TableData>({
        name: 'expand',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Expand view",
        icon: <Maximize2 className="h-4 w-4"/>,
        className: "text-secondary hover:bg-secondary hover:text-secondary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Expanding view:', context.data);
        }
    }),

    search: createTableCommand<TableData>({
        name: 'search',
        type: 'feature',
        scope: 'custom',
        component: Button,
        label: "Search items",
        icon: <Search className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",

        onExecuteTable: async (context) => {
            console.log('Opening search');
        }
    }),

    filter: createTableCommand<TableData>({
        name: 'filter',
        type: 'feature',
        scope: 'custom',
        component: Button,
        label: "Filter items",
        icon: <Filter className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",

        onExecuteTable: async (context) => {
            console.log('Opening filters');
        }
    }),

    // Update actions
    edit: createTableCommand<TableData>({
        name: 'edit',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Edit this item",
        icon: <Edit className="h-4 w-4"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Editing:', context.data);
        }
    }),

    save: createTableCommand<TableData>({
        name: 'save',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Save changes",
        icon: <Save className="h-4 w-4"/>,
        className: "text-success hover:bg-success hover:text-success-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Saving:', context.data);
        }
    }),

    cancel: createTableCommand<TableData>({
        name: 'cancel',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Cancel changes",
        icon: <X className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Cancelling changes:', context.data);
        }
    }),

    delete: createTableCommand<TableData>({
        name: 'delete',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Delete this item",
        icon: <Trash className="h-4 w-4"/>,
        className: "text-destructive hover:bg-destructive hover:text-destructive-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Deleting:', context.data);
        },
        onErrorTable: (error, context) => {
            console.error('Delete failed:', error);
        }
    }),

    archive: createTableCommand<TableData>({
        name: 'archive',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Archive this item",
        icon: <Archive className="h-4 w-4"/>,
        className: "text-warning hover:bg-warning hover:text-warning-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Archiving:', context.data);
        }
    }),

    // Utility actions
    refresh: createTableCommand<TableData>({
        name: 'refresh',
        type: 'feature',
        scope: 'custom',
        component: Button,
        label: "Refresh data",
        icon: <RefreshCw className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",

        onExecuteTable: async (context) => {
            console.log('Refreshing data');
        }
    }),

    export: createTableCommand<TableData>({
        name: 'export',
        type: 'feature',
        scope: 'custom',
        component: Button,
        label: "Export data",
        icon: <Download className="h-4 w-4"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",

        onExecuteTable: async (context) => {
            console.log('Exporting data');
        }
    }),

    import: createTableCommand<TableData>({
        name: 'import',
        type: 'feature',
        scope: 'custom',
        component: Button,
        label: "Import data",
        icon: <Upload className="h-4 w-4"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",

        onExecuteTable: async (context) => {
            console.log('Importing data');
        }
    }),

    more: createTableCommand<TableData>({
        name: 'more',
        type: 'feature',
        scope: 'single',
        component: Button,
        label: "More options",
        icon: <MoreHorizontal className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Opening more options:', context.data);
        }
    }),

    approve: createTableCommand<TableData>({
        name: 'approve',
        type: 'entity',
        scope: 'single',
        component: Button,
        label: "Approve item",
        icon: <CheckCircle className="h-4 w-4"/>,
        className: "text-success hover:bg-success hover:text-success-foreground",

        isEnabled: (context) => !!context.data,
        onExecuteTable: async (context) => {
            console.log('Approving:', context.data);
        }
    })
};

// Usage example in a component
const TableActions: React.FC<{ data: TableData }> = ({ data }) => {
    return (
        <div className="flex gap-2">
            <tableCommands.view
                data={data}
                rowId={data.id}
                onExecute={async (context) => {
                    // Custom view handling
                    console.log('Custom view:', context);
                }}
            />
            <tableCommands.edit
                data={data}
                rowId={data.id}
            />
            <tableCommands.delete
                data={data}
                rowId={data.id}
            />
            <tableCommands.more
                data={data}
                rowId={data.id}
            />
        </div>
    );
};

// export type TableActionName = keyof typeof tableCommands;


export const simpleTableActions: Record<string, SimpleAction> = {
    create: {
        name: 'create',
        label: "Create new item",
        icon: <Plus className="h-4 w-4"/>,
        className: "text-success hover:bg-success hover:text-success-foreground",
    },
    duplicate: {
        name: 'duplicate',
        label: "Duplicate this item",
        icon: <Copy className="h-4 w-4"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
    },

    // Read actions
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
    search: {
        name: 'search',
        label: "Search items",
        icon: <Search className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
    },
    filter: {
        name: 'filter',
        label: "Filter items",
        icon: <Filter className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
    },

    // Update actions
    edit: {
        name: 'edit',
        label: "Edit this item",
        icon: <Edit className="h-4 w-4"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
    },
    save: {
        name: 'save',
        label: "Save changes",
        icon: <Save className="h-4 w-4"/>,
        className: "text-success hover:bg-success hover:text-success-foreground",
    },
    cancel: {
        name: 'cancel',
        label: "Cancel changes",
        icon: <X className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
    },

    delete: {
        name: 'delete',
        label: "Delete this item",
        icon: <Trash className="h-4 w-4"/>,
        className: "text-destructive hover:bg-destructive hover:text-destructive-foreground",
    },
    archive: {
        name: 'archive',
        label: "Archive this item",
        icon: <Archive className="h-4 w-4"/>,
        className: "text-warning hover:bg-warning hover:text-warning-foreground",
    },

    // Utility actions
    refresh: {
        name: 'refresh',
        label: "Refresh data",
        icon: <RefreshCw className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
    },
    export: {
        name: 'export',
        label: "Export data",
        icon: <Download className="h-4 w-4"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
    },
    import: {
        name: 'import',
        label: "Import data",
        icon: <Upload className="h-4 w-4"/>,
        className: "text-primary hover:bg-primary hover:text-primary-foreground",
    },
    more: {
        name: 'more',
        label: "More options",
        icon: <MoreHorizontal className="h-4 w-4"/>,
        className: "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
    },
    approve: {
        name: 'approve',
        label: "Approve item",
        icon: <CheckCircle className="h-4 w-4"/>,
        className: "text-success hover:bg-success hover:text-success-foreground",
    },
};



interface SimpleAction {
    name: string;
    label: string;
    icon: React.ReactElement;
    className?: string;
    disabled?: boolean;
    hidden?: boolean;
    callback?: (data: TableData) => void;
    variant?: VariantProps<typeof buttonVariants>["variant"];
    size?: VariantProps<typeof buttonVariants>["size"];
}

interface TableActionIconProps {
    actionName: string;
    data: TableData;
    onAction: (actionName: string, data: TableData) => void;
    className?: string;
}

export const TableActionIcon = React.forwardRef<
    HTMLButtonElement,
    TableActionIconProps
>(({ actionName, data, onAction, className }, ref) => {
    const action = simpleTableActions[actionName];
    if (!action) return null;

    const {
        name,
        label,
        icon,
        disabled = false,
        hidden = false,
        callback,
        variant = "ghost",
        size = "sm" as "default" | "sm" | "lg" | "icon",
    } = action;

    if (hidden) return null;

    const handleClick = React.useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (callback) {
                callback(data);
            }
            onAction(name, data);
        },
        [callback, data, name, onAction]
    );

    return (
        <MatrxTooltip content={label} placement="left">
            <Button
                ref={ref}
                onClick={handleClick}
                size={size as "default" | "sm" | "lg" | "icon"}
                variant={variant}
                disabled={disabled}
                className={cn(
                    "transition-all duration-300 hover:scale-105",
                    disabled && "cursor-not-allowed",
                    action.className,
                    className
                )}
            >
                {React.isValidElement(icon) &&
                    React.cloneElement<any>(icon, {
                        className: cn(
                            "w-3 h-3",
                            (icon.props as any).className
                        )
                    })
                }
            </Button>
        </MatrxTooltip>
    );
});

TableActionIcon.displayName = "TableActionIcon";
