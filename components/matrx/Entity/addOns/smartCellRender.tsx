import {Switch, Button, Tooltip, TooltipContent, TooltipTrigger, Badge} from "@/components/ui"
import {Link} from "lucide-react"
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {ButtonSize, ButtonVariant} from "../types/tableBuilderTypes";
import {ActionConfig, SmartFieldConfig, TableColumn} from "@/components/matrx/Entity/types/advancedDataTableTypes";
import { useMemo } from 'react';
import {Row} from "@tanstack/react-table";
import {EntityDataWithId} from "@/lib/redux/entity/types/stateTypes";


const getSpecialValue = (value: any, formatting: any) => {
    if (value === null) return formatting.nullValue;
    if (value === undefined) return formatting.undefinedValue;
    if (value === '') return formatting.emptyValue;
    return undefined;
};

const formatDate = (value: any) => {
    return value instanceof Date
           ? new Intl.DateTimeFormat('en-US', {dateStyle: 'medium'}).format(value)
           : value;
};

const formatNumber = (value: number, numberFormat?: any) => {
    return new Intl.NumberFormat('en-US', numberFormat).format(value);
};

const formatCurrency = (value: number, numberFormat?: any) => {
    return new Intl.NumberFormat('en-US', {
        ...numberFormat,
        style: 'currency',
        currency: numberFormat?.currency || 'USD'
    }).format(value);
};

const truncateText = (text: string, maxCharacters: number) => {
    if (!text) return '';
    return text.length > maxCharacters
           ? `${text.substring(0, maxCharacters)}...`
           : text;
};

export const formatCellValue = (value: any, fieldType: string, formatting: any, maxCharacters: number, meta?: any) => {
    const specialValue = getSpecialValue(value, formatting);
    if (specialValue !== undefined) return specialValue;

    if (meta?.format) {
        return meta.format(value);
    }

    switch (fieldType.toLowerCase()) {
        case 'boolean':
            return value ? formatting.booleanFormat.true : formatting.booleanFormat.false;
        case 'date':
            return formatDate(value);
        case 'number':
            return typeof value === 'number' ? formatNumber(value, formatting.numberFormat) : value;
        case 'currency':
            return typeof value === 'number' ? formatCurrency(value, formatting.numberFormat) : value;
        case 'string':
            return String(value);
        case 'time':
            return new Date(value).toLocaleTimeString();
        case 'datetime':
            return new Date(value).toLocaleString();
        case 'json':
            return JSON.stringify(value, null, 2);
        default:
            return truncateText(String(value), maxCharacters);
    }
};


// Separate handlers for each type
const handleNonNativeField = (value: any, databaseTable: string) => (
    <Link
        href={`/${databaseTable}`}
        className="text-blue-600 hover:underline"
    >
        View {databaseTable}
    </Link>
);

const handleBooleanField = (value: boolean, config?: SmartFieldConfig['boolean']) => {
    if (!config || config.component === 'text') return String(value);

    return (
        <Switch
            checked={value}
            disabled
            {...(config.props || {})}
        />
    );
};

interface UUIDFieldConfig {
    component: 'button' | 'link' | 'copy' | 'text';
    onUUIDClick?: (uuid: string) => void;
    globalLabel?: string;
    props?: Record<string, any>;
}

const handleUUIDField = (value: string, config?: UUIDFieldConfig | null) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => config?.onUUIDClick?.(value)}
                >
                    {config?.globalLabel || 'Unique ID'}
                </Badge>
            </TooltipTrigger>
            <TooltipContent>
                <code className="text-xs font-mono">{value}</code>
            </TooltipContent>
        </Tooltip>
    );
};

const handleDateField = (value: any) => {
    const date = new Date(value);
    return date.toLocaleDateString();
};

const handleNumberField = (value: number) => {
    return new Intl.NumberFormat().format(value);
};

const handleArrayField = (value: any[]) => {
    if (!Array.isArray(value)) return '0 items';

    return (
        <Tooltip>
            <TooltipTrigger>
                {value.length} items
            </TooltipTrigger>
            <TooltipContent>
                {value.join(', ')}
            </TooltipContent>
        </Tooltip>
    );
};

const handleObjectField = (value: object) => {
    console.log('handleObjectField with Object:', value);
    const display = JSON.stringify(value);
    return (
        <Tooltip>
            <TooltipTrigger>
                {'{...}'}
            </TooltipTrigger>
            <TooltipContent>
                {display}
            </TooltipContent>
        </Tooltip>
    );
};



export const createSmartCellRenderer = (
    fieldType: string,
    fieldKey: string,
    smartConfig: SmartFieldConfig,
    metadata: {
        isNative: boolean;
        databaseTable?: string;
    }
) => {
    return useMemo(() => {
        return ({ getValue }: { getValue: () => any }) => {
            const value = getValue();

            if (value === null || value === undefined) return '';
            if (!metadata.isNative && metadata.databaseTable) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('Non-native field:', fieldKey, value);
                }
                return handleNonNativeField(value, metadata.databaseTable);
            }

            switch (fieldType) {
                case 'string':
                    return String(value);

                case 'number':
                    return handleNumberField(value);

                case 'boolean':
                    return handleBooleanField(value, smartConfig.boolean);

                case 'date':
                    return handleDateField(value);

                case 'uuid':
                    return handleUUIDField(value, smartConfig.uuid);

                case 'object':
                    return handleObjectField(value);

                case 'array':
                    return handleArrayField(value);

                default:
                    return String(value);
            }
        };
    }, [fieldType, fieldKey, metadata.isNative, metadata.databaseTable, smartConfig.boolean, smartConfig.uuid]);
};

export const createActionColumn = <TEntity extends EntityKeys>(
    config: ActionConfig,
    onAction: (action: string, row: EntityDataWithId<TEntity>) => void
): TableColumn => {
    const calculateWidth = () => {
        let totalWidth = 0;
        if (config.view?.enabled) totalWidth += 40;
        if (config.edit?.enabled) totalWidth += 40;
        if (config.delete?.enabled) totalWidth += 50;
        config.custom?.forEach(() => totalWidth += 60);

        const numberOfGaps = [
            config.view?.enabled ? 1 : 0,
            config.edit?.enabled ? 1 : 0,
            config.delete?.enabled ? 1 : 0,
            ...(config.custom?.map(() => 1) || [])
        ].reduce((sum, current) => sum + current, 0) - 1;

        return totalWidth + (Math.max(0, numberOfGaps) * 8);
    };

    const width = calculateWidth();

    return {
        id: 'actions',
        accessorKey: 'actions',
        header: 'Actions',
        cell: ({row}) => {
            const actions = [];

            if (config.view?.enabled) {
                actions.push({
                    label: 'View',
                    onClick: () => {
                        if (config.view?.custom) {
                            config.view.custom(row.original);
                        } else {
                            onAction('view', row.original);
                        }
                    },
                    variant: config.view.variant || 'secondary',
                    size: config.view.size || 'xs'
                });
            }

            if (config.edit?.enabled) {
                actions.push({
                    label: 'Edit',
                    onClick: () => {
                        if (config.edit?.custom) {
                            config.edit.custom(row.original);
                        } else {
                            onAction('edit', row.original);
                        }
                    },
                    variant: config.edit.variant || 'outline',
                    size: config.edit.size || 'xs'
                });
            }

            if (config.delete?.enabled) {
                actions.push({
                    label: 'Delete',
                    onClick: () => {
                        if (config.delete?.custom) {
                            config.delete.custom(row.original);
                        } else {
                            onAction('delete', row.original);
                        }
                    },
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
                <div className="flex gap-2 justify-end w-full">
                    {actions.map((action, index) => (
                        <Button
                            key={`${action.label}-${index}`}
                            variant={action.variant}
                            size={action.size}
                            onClick={action.onClick}
                            className="whitespace-nowrap"
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
        size: width,
        minSize: width,
        maxSize: width,
        meta: {
            key: 'actions',
            title: 'actions',
            isPrimaryKey: false,
            isDisplayField: false,
            dataType: 'actions',
            fieldType: 'actions',
            sortable: false,
            filterable: false,
            groupable: false,
            align: 'right',
            width
        }
    };
};

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


// concept for later:

interface TableDisplayConfig {
    // Basic display settings
    display: {
        hidden?: boolean;              // Whether to hide this column by default
        width?: number;                // Default column width in pixels
        align?: 'left' | 'center' | 'right';
        truncate?: boolean;            // Whether to truncate long content
        maxLength?: number;            // Max characters before truncating
    };

    // Formatting options based on data type
    format?: {
        // Numbers
        number?: {
            type: 'decimal' | 'percent' | 'currency';
            minimumFractionDigits?: number;
            maximumFractionDigits?: number;
            currency?: string;         // For currency formatting (USD, EUR, etc.)
            compact?: boolean;         // Use compact notation (1K, 1M, etc.)
        };

        // Dates
        date?: {
            type: 'date' | 'time' | 'datetime';
            format?: 'short' | 'medium' | 'long';
            timezone?: string;
        };

        // Text
        text?: {
            case?: 'upper' | 'lower' | 'title';
            prefix?: string;
            suffix?: string;
        };
    };

    // Cell styling
    style?: {
        backgroundColor?: string;
        textColor?: string;
        fontWeight?: 'normal' | 'bold';
        className?: string;           // Custom CSS class
    };

    // Conditional formatting
    conditions?: Array<{
        when: {
            value?: any;              // Match exact value
            range?: [number, number]; // For number ranges
            contains?: string;        // For text search
            regex?: string;          // For pattern matching
        };
        style: {
            backgroundColor?: string;
            textColor?: string;
            fontWeight?: 'normal' | 'bold';
            className?: string;
        };
    }>;
}

// Example usage in your schema:
interface FieldMetadata {
    // ... your existing metadata ...
    tableConfig?: TableDisplayConfig;
}

// Example of how it would be used:
const exampleSchema = {
    fields: {
        price: {
            dataType: 'number',
            isNative: true,
            tableConfig: {
                display: {
                    align: 'right',
                    width: 120
                },
                format: {
                    number: {
                        type: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2
                    }
                },
                conditions: [
                    {
                        when: {range: [0, 100]},
                        style: {textColor: 'green'}
                    },
                    {
                        when: {range: [100, 1000]},
                        style: {textColor: 'orange'}
                    },
                    {
                        when: {range: [1000, Infinity]},
                        style: {textColor: 'red'}
                    }
                ]
            }
        },
        status: {
            dataType: 'string',
            isNative: true,
            tableConfig: {
                display: {
                    align: 'center',
                    width: 100
                },
                conditions: [
                    {
                        when: {value: 'active'},
                        style: {
                            backgroundColor: '#e6ffe6',
                            textColor: '#006600',
                            className: 'status-active'
                        }
                    },
                    {
                        when: {value: 'inactive'},
                        style: {
                            backgroundColor: '#ffe6e6',
                            textColor: '#660000',
                            className: 'status-inactive'
                        }
                    }
                ]
            }
        },
        createdAt: {
            dataType: 'date',
            isNative: true,
            tableConfig: {
                display: {
                    align: 'left',
                    width: 160
                },
                format: {
                    date: {
                        type: 'datetime',
                        format: 'medium'
                    }
                }
            }
        }
    }
};
