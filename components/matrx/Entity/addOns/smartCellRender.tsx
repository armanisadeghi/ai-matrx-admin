import { Switch, Checkbox, Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui"
import { Link } from "lucide-react"
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {ButtonSize, ButtonVariant } from "../types/tableBuilderTypes";


export interface FormattingConfig {
    nullValue: string;
    undefinedValue: string;
    emptyValue: string;
    booleanFormat: {
        true: string;
        false: string;
    };
    numberFormat: {
        minimumFractionDigits: number;
        maximumFractionDigits: number;
    };
}

export interface ActionConfig {
    view?: {
        enabled: boolean;
        variant?: ButtonVariant;
        size?: ButtonSize;
        custom?: (row: any) => void;
    };
    edit?: {
        enabled: boolean;
        variant?: ButtonVariant;
        size?: ButtonSize;
        custom?: (row: any) => void;
    };
    delete?: {
        enabled: boolean;
        variant?: ButtonVariant;
        size?: ButtonSize;
        custom?: (row: any) => void;
    };
    custom?: Array<{
        key: string;
        label: string;
        variant?: ButtonVariant;
        size?: ButtonSize;
        handler: (row: any) => void;
    }>;
}

export interface AdvancedDataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    variant?: 'default' | 'compact' | 'cards' | 'minimal';
    options?: {
        showCheckboxes?: boolean;
        showFilters?: boolean;
        showActions?: boolean;
        enableSorting?: boolean;
        enableGrouping?: boolean;
        enableColumnResizing?: boolean;
    };
    formatting?: FormattingConfig;
    smartFields?: SmartFieldConfig;
    actions?: ActionConfig;
    onAction?: (action: string, row: EntityData<TEntity>) => void;
}

export const formatCellValue = (value: any, fieldType: string) => {
    switch (fieldType) {
        case 'string':
            return String(value);
        case 'number':
            return Number(value);
        case 'date':
            return new Date(value).toLocaleDateString();
        case 'time':
            return new Date(value).toLocaleTimeString();
        case 'datetime':
            return new Date(value).toLocaleString();
        case 'json':
            return JSON.stringify(value, null, 2);
        default:
            return value;
    }
};

export interface SmartFieldConfig {
    boolean: {
        component: 'switch' | 'checkbox' | 'text';
        props?: Record<string, any>;
    };
    uuid: {
        component: 'button' | 'link' | 'copy' | 'text';
        props?: Record<string, any>;
    };
    reference: {
        component: 'link' | 'modal' | 'sidebar' | 'page';
        props?: Record<string, any>;
    };
    // Add handling for non-native relationships
    relationship: {
        component: 'link' | 'modal' | 'count' | 'preview';
        props?: Record<string, any>;
    };
}


export const createSmartCellRenderer = (
    fieldType: string,
    fieldKey: string,
    smartConfig: SmartFieldConfig,
    metadata: {
        isNative?: boolean;
        isArray?: boolean;
        databaseTable?: string;
        maxLength?: number;
        isRequired?: boolean;
        defaultComponent?: string;
        componentProps?: Record<string, any>;
    },
    referenceData?: Record<string, any>
) => {
    return ({getValue, row}: { getValue: () => any, row: any }) => {
        const value = getValue();

        // Handle non-native fields (relationships)
        if (!metadata.isNative) {
            return (
                <div className="text-blue-600 font-medium">
                    {metadata.isArray ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={() => {/* handle relationship click */}}
                        >
                            View Related {metadata.databaseTable || 'Items'}
                        </Button>
                    ) : (
                         <Tooltip>
                             <TooltipTrigger className="cursor-pointer hover:underline">
                                 {value || `View ${metadata.databaseTable || 'Related Item'}`}
                             </TooltipTrigger>
                             <TooltipContent>
                                 View related {metadata.databaseTable} details
                             </TooltipContent>
                         </Tooltip>
                     )}
                </div>
            );
        }

        // Use metadata's defaultComponent if available
        if (metadata.defaultComponent && metadata.componentProps) {
            const Component = metadata.defaultComponent;
            return <Component {...metadata.componentProps} value={value} />;
        }

        switch (fieldType) {
            case 'boolean':
                return smartConfig.boolean.component === 'switch' ? (
                    <div className={metadata.isRequired ? 'required-field' : ''}>
                        <Switch
                            checked={value}
                            disabled
                            {...smartConfig.boolean.props}
                        />
                    </div>
                ) : smartConfig.boolean.component === 'checkbox' ? (
                    <div className={metadata.isRequired ? 'required-field' : ''}>
                        <Checkbox
                            checked={value}
                            disabled
                            {...smartConfig.boolean.props}
                        />
                    </div>
                ) : String(value);

            case 'uuid':
                return smartConfig.uuid.component === 'button' ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {/* handle click */}}
                                {...smartConfig.uuid.props}
                            >
                                {value.substring(0, 8)}...
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {value}
                        </TooltipContent>
                    </Tooltip>
                ) : value;

            case 'reference':
                if (!metadata.databaseTable) return value;

                return smartConfig.reference.component === 'link' ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href={`/${metadata.databaseTable}/${value}`}
                                className="text-blue-600 hover:underline"
                                {...smartConfig.reference.props}
                            >
                                {referenceValue?.displayField || value}
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                            View {metadata.databaseTable} details
                        </TooltipContent>
                    </Tooltip>
                ) : (
                           <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => {/* handle reference click */}}
                           >
                               View {metadata.databaseTable}
                           </Button>
                       );

            default:
                // Handle arrays
                if (metadata.isArray) {
                    if (Array.isArray(value)) {
                        return (
                            <Tooltip>
                                <TooltipTrigger className="text-purple-600">
                                    {value.length} items
                                </TooltipTrigger>
                                <TooltipContent>
                                    {value.join(', ')}
                                </TooltipContent>
                            </Tooltip>
                        );
                    }
                    return '0 items';
                }

                // Use metadata maxLength if available
                const maxLength = metadata.maxLength || 100;
                const displayValue = value?.toString() || '';

                return displayValue.length > maxLength ? (
                    <Tooltip>
                        <TooltipTrigger className={metadata.isRequired ? 'required-field' : ''}>
                            {displayValue.substring(0, maxLength)}...
                        </TooltipTrigger>
                        <TooltipContent>
                            {displayValue}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                           <span className={metadata.isRequired ? 'required-field' : ''}>
                        {displayValue}
                    </span>
                       );
        }
    };
};

// Base action interface
interface Action {
    label: string;
    onClick: () => void;
    variant: ButtonVariant;
    size: ButtonSize;
}


// Interface for the default actions format expected by the table builder
interface DefaultActionColumn {
    type: "actions";
    options: {
        actions: Array<{
            label: string;
            onClick: (row: any) => void;
            variant: ButtonVariant;
            size: ButtonSize;
        }>;
        containerClassName: string;
    };
}


export const createActionColumn = <TEntity extends EntityKeys>(
    config: ActionConfig,
    onAction: (action: string, row: EntityData<TEntity>) => void
) => {
    return {
        id: 'actions',
        accessorKey: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
            const actions = [];

            if (config.view?.enabled) {
                actions.push({
                    label: 'View',
                    onClick: () => config.view?.custom?.(row.original) ??
                        onAction('view', row.original),
                    variant: config.view.variant || 'secondary',
                    size: config.view.size || 'xs'
                });
            }

            if (config.edit?.enabled) {
                actions.push({
                    label: 'Edit',
                    onClick: () => config.edit?.custom?.(row.original) ??
                        onAction('edit', row.original),
                    variant: config.edit.variant || 'outline',
                    size: config.edit.size || 'xs'
                });
            }

            if (config.delete?.enabled) {
                actions.push({
                    label: 'Delete',
                    onClick: () => config.delete?.custom?.(row.original) ??
                        onAction('delete', row.original),
                    variant: config.delete.variant || 'destructive',
                    size: config.delete.size || 'xs'
                });
            }

            config.custom?.forEach(customAction => {
                actions.push({
                    label: customAction.label,
                    onClick: () => customAction.handler(row.original),
                    variant: customAction.variant || 'outline',
                    size: customAction.size || 'xs'
                });
            });

            return (
                <div className="flex gap-2 justify-end">
                    {actions.map((action, index) => (
                        <Button
                            key={`${action.label}-${index}`}
                            variant={action.variant}
                            size={action.size}
                            onClick={action.onClick}
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            );
        },
        enableSorting: false,
        enableGrouping: false,
        enableResizing: true,
        meta: {
            fieldType: 'actions',
            sortable: false,
            filterable: false,
            groupable: false,
            align: 'right' as const
        }
    };
};

export interface ColumnMeta {
    isPrimaryKey?: boolean;
    isDisplayField?: boolean;
    fieldType?: string;
    sortable?: boolean;
    filterable?: boolean;
    groupable?: boolean;
    align?: 'left' | 'center' | 'right';
    format?: any;
    validation?: any;
}



// Create default table actions in the format expected by the table builder
export const createDefaultTableActions = (
    handleAction: (actionName: string, rowData: any) => void
): { basic: DefaultActionColumn; expanded: DefaultActionColumn } => ({
    basic: {
        type: "actions",
        options: {
            actions: [
                {
                    label: "Edit",
                    onClick: (row) => handleAction('edit', row),
                    variant: "outline",
                    size: "xs"
                },
                {
                    label: "Delete",
                    onClick: (row) => handleAction('delete', row),
                    variant: "destructive",
                    size: "xs"
                }
            ],
            containerClassName: "justify-end"
        }
    },
    expanded: {
        type: "actions",
        options: {
            actions: [
                {
                    label: "View",
                    onClick: (row) => handleAction('view', row),
                    variant: "secondary",
                    size: "xs"
                },
                {
                    label: "Edit",
                    onClick: (row) => handleAction('edit', row),
                    variant: "outline",
                    size: "xs"
                },
                {
                    label: "Delete",
                    onClick: (row) => handleAction('delete', row),
                    variant: "destructive",
                    size: "xs"
                }
            ],
            containerClassName: "justify-end"
        }
    }
});
