// components/table/columnDefinitions.tsx
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {
    Checkbox,
    Button,
    Badge,
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@/components/ui";

import {formatDistance} from 'date-fns';
import {cn} from "@/lib/utils";
import {MatrixTableTooltip} from "@/components/matrx/Entity";
import {ButtonProps} from "@/components/ui/button";
import {CheckCircle, Filter, LinkIcon, XCircle} from "lucide-react";

import {Row, ColumnDef, Column} from '@tanstack/react-table';
import {TableFilter} from "@/components/matrx/Entity/addOns/TableFilter";

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData, TValue> {
        filterVariant?: 'text' | 'range' | 'select'
        filterOptions?: string[]
    }
}

export type ColumnType =
    | "select"
    | "data"
    | "status"
    | "datetime"
    | "boolean"
    | "number"
    | "currency"
    | "actions"
    | "link"
    | "badge"
    | "progress"
    | "chip"
    | "avatar"
    | "rating"
    | "tags"
    | "expandable"
    | "file"
    | "json"
    | "code"
    | "custom";


type ButtonVariant = NonNullable<ButtonProps["variant"]>;
type ButtonSize = NonNullable<ButtonProps["size"]>;
type FilterVariant = 'text' | 'range' | 'select';

export type BaseFilter = {
    variant: FilterVariant;
    options?: string[];
    placeholder?: string;
};

// Base options that all columns share
export type BaseColumnOptions = {
    key: string;
    title: string;
    filter?: BaseFilter;
};

// Specific column type options
export type DataColumnOptions = {
    type: "data";
    options: BaseColumnOptions & {
        truncate?: boolean;
        maxWidth?: string;
    };
};

export type StatusColumnOptions = {
    type: "status";
    options: BaseColumnOptions & {
        states: Record<string, {
            label: string;
            color: "default" | "destructive" | "outline" | "secondary" | "warning";
        }>;
    };
};

export type ActionColumnOptions<TEntity extends EntityKeys> = {
    type: "actions";
    options: {
        actions: Array<{
            id?: string;
            label: string;
            icon?: React.ComponentType<{ className?: string }>;
            onClick: (row: EntityData<TEntity>) => void;
            variant?: ButtonVariant;
            size?: ButtonSize;
            className?: string;
        }>;
        containerClassName?: string;
    };
};

// Union type of all possible column configurations
export type ColumnOptions <TEntity extends EntityKeys> =
    | { type: "select" }
    | DataColumnOptions
    | StatusColumnOptions
    | ActionColumnOptions<TEntity>;

// Builder function type
export type TableColumnBuilder = <TEntity extends EntityKeys>(
    columns: ColumnOptions<EntityKeys>[]
) => ColumnDef<EntityData<TEntity>>[];


export const createTableColumnDefinitions = <TEntity extends EntityKeys>() => {
    // Original select column
    const createSelectColumn = (): ColumnDef<EntityData<TEntity>> => ({
        id: "select",
        header: ({table}) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || false}
                onCheckedChange={(checked: boolean) => {
                    table.toggleAllPageRowsSelected(!!checked);
                }}
                aria-label="Select all"
            />
        ),
        cell: ({row}) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(checked: boolean) => {
                    row.toggleSelected(!!checked);
                }}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    });

    // Basic data column with tooltip
    const createDataColumn = (options: {
        key: string;
        title: string;
        filter?: {
            variant: 'text' | 'range' | 'select';
            options?: string[];
        }
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: ({column}) => (
            <div className="space-y-2">
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    {options.title}
                </Button>
                {options.filter && <TableFilter column={column}/>}
            </div>
        ),
        meta: options.filter ? {
            filterVariant: options.filter.variant,
            filterOptions: options.filter.options
        } : undefined,
        cell: ({getValue}) => {
            const value = getValue();
            const displayValue = String(value);

            return displayValue.length > 50 ? (
                <MatrixTableTooltip
                    content={
                        <p className="max-w-xs whitespace-normal break-words">
                            {displayValue}
                        </p>
                    }
                >
                    <div className="truncate max-w-[200px] cursor-help">
                        {displayValue}
                    </div>
                </MatrixTableTooltip>
            ) : displayValue;
        },
    });

    // Update status column to include filtering
    const createStatusColumn = (options: {
        key: string;
        title: string;
        states: Record<string, {
            label: string;
            color: "default" | "destructive" | "outline" | "secondary" | "warning";
        }>;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: ({column}) => (
            <div className="space-y-2">
                <span>{options.title}</span>
                <TableFilter column={column}/>
            </div>
        ),
        cell: ({getValue}) => {
            const status = getValue() as string;
            const state = options.states[status];
            return (
                <Badge variant={state.color}>
                    {state.label}
                </Badge>
            );
        },
        meta: {
            filterVariant: 'select',
            filterOptions: Object.keys(options.states)
        }
    });

    // DateTime column with formatting
    const createDateTimeColumn = (options: {
        key: string;
        title: string;
        format?: "relative" | "absolute";
        showTime?: boolean;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue}) => {
            const date = new Date(getValue() as string);
            if (options.format === "relative") {
                return formatDistance(date, new Date(), {addSuffix: true});
            }
            return date.toLocaleString();
        }
    });


    const createActionsColumn = (options: {
        actions: Array<{
        id?: string;
            label: string;
            icon?: React.ComponentType<{ className?: string }>;
            onClick: (row: EntityData<TEntity>) => void;
            variant?: ButtonVariant; //  "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
            size?: ButtonSize; //  "xs" | "s" | "sm" | "m" | "default" | "l" | "lg" | "xl" | "icon"
            className?: string; // Allow additional styling
        }>;
        containerClassName?: string; // Optional class for the action buttons container
    }): ColumnDef<EntityData<TEntity>> => ({
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        cell: ({row}) => (
            <div className={cn("flex items-center gap-2", options.containerClassName)}>
                {options.actions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                        <Button
                            key={index}
                            variant={action.variant || "outline"}
                            size={action.size || "xs"}
                            onClick={() => action.onClick(row.original)}
                            className={action.className}
                        >
                            {Icon && <Icon className="h-4 w-4 mr-2"/>}
                            {action.label}
                        </Button>
                    );
                })}
            </div>
        )
    });
    // Progress column
    const createProgressColumn = (options: {
        key: string;
        title: string;
        showPercentage?: boolean;
        colorScale?: boolean;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue}) => {
            const value = getValue() as number;
            return (
                <div className="w-full">
                    <div className="h-2 bg-gray-200 rounded-full">
                        <div
                            className={cn(
                                "h-full rounded-full",
                                options.colorScale
                                ? value > 66
                                  ? "bg-green-500"
                                  : value > 33
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                : "bg-blue-500"
                            )}
                            style={{width: `${value}%`}}
                        />
                    </div>
                    {options.showPercentage && (
                        <span className="text-sm text-gray-500">{value}%</span>
                    )}
                </div>
            );
        }
    });

    const createBooleanColumn = (options: {
        key: string;
        title: string;
        trueLabel?: string;
        falseLabel?: string;
        icon?: boolean;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue}) => {
            const value = getValue() as boolean;
            if (options.icon) {
                return value ?
                       <CheckCircle className="text-green-500 h-5 w-5"/> :
                       <XCircle className="text-red-500 h-5 w-5"/>;
            }
            return (
                <Badge variant={value ? "default" : "destructive"}>
                    {value ? (options.trueLabel || "Yes") : (options.falseLabel || "No")}
                </Badge>
            );
        }
    });

    const createNumberColumn = (options: {
        key: string;
        title: string;
        format?: "decimal" | "percent" | "compact";
        precision?: number;
        prefix?: string;
        suffix?: string;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue}) => {
            const value = getValue() as number;
            let formatted: string;

            switch (options.format) {
                case "decimal":
                    formatted = value.toFixed(options.precision || 2);
                    break;
                case "percent":
                    formatted = (value * 100).toFixed(options.precision || 1);
                    break;
                case "compact":
                    formatted = Intl.NumberFormat('en', {notation: 'compact'}).format(value);
                    break;
                default:
                    formatted = value.toString();
            }

            return `${options.prefix || ''}${formatted}${options.suffix || ''}`;
        }
    });
    const createCurrencyColumn = (options: {
        key: string;
        title: string;
        currency?: string;
        locale?: string;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue}) => {
            const value = getValue() as number;
            return new Intl.NumberFormat(options.locale || 'en-US', {
                style: 'currency',
                currency: options.currency || 'USD'
            }).format(value);
        }
    });

    const createLinkColumn = (options: {
        key: string;
        title: string;
        href: (value: any, row: EntityData<TEntity>) => string;
        external?: boolean;
        icon?: boolean;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue, row}) => (
            <a
                href={options.href(getValue(), row.original)}
                className="text-blue-500 hover:text-blue-700 underline"
                {...(options.external ? {target: "_blank", rel: "noopener noreferrer"} : {})}
            >
                {options.icon && <LinkIcon className="h-4 w-4 inline mr-1"/>}
                {getValue() as string}
            </a>
        )
    });

    const createTagsColumn = (options: {
        key: string;
        title: string;
        colors?: Record<string, string>;
        maxDisplay?: number;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue}) => {
            const tags = getValue() as string[];
            const displayTags = options.maxDisplay ? tags.slice(0, options.maxDisplay) : tags;
            const remaining = tags.length - displayTags.length;

            return (
                <div className="flex flex-wrap gap-1">
                    {displayTags.map((tag, index) => (
                        <Badge
                            key={index}
                            variant="outline"
                            className={options.colors?.[tag]}
                        >
                            {tag}
                        </Badge>
                    ))}
                    {remaining > 0 && (
                        <MatrixTableTooltip
                            content={
                                <div className="flex flex-col gap-1">
                                    {tags.slice(options.maxDisplay).map((tag, index) => (
                                        <span key={index}>{tag}</span>
                                    ))}
                                </div>
                            }
                        >
                            <Badge variant="outline">+{remaining}</Badge>
                        </MatrixTableTooltip>
                    )}
                </div>
            );
        }
    });

    const createJsonColumn = (options: {
        key: string;
        title: string;
        expandable?: boolean;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue}) => {
            const value = getValue();
            const formatted = JSON.stringify(value, null, 2);

            if (!options.expandable) {
                return (
                    <MatrixTableTooltip
                        content={
                            <pre className="max-w-lg overflow-auto">
                            <code>{formatted}</code>
                        </pre>
                        }
                    >
                        <div className="truncate max-w-[200px] cursor-help font-mono text-sm">
                            {JSON.stringify(value)}
                        </div>
                    </MatrixTableTooltip>
                );
            }

            return (
                <Collapsible>
                    <CollapsibleTrigger className="font-mono text-sm">
                        {JSON.stringify(value).substring(0, 30)}...
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                    <pre className="mt-2 max-h-[300px] overflow-auto">
                        <code>{formatted}</code>
                    </pre>
                    </CollapsibleContent>
                </Collapsible>
            );
        }
    });

    // Custom column with render function
    const createCustomColumn = (options: {
        key: string;
        title: string;
        render: (value: any, row: EntityData<TEntity>) => React.ReactNode;
    }): ColumnDef<EntityData<TEntity>> => ({
        id: options.key,
        accessorKey: options.key,
        header: options.title,
        cell: ({getValue, row}) => options.render(getValue(), row.original)
    });

    return {
        createSelectColumn,
        createDataColumn,
        createStatusColumn,
        createDateTimeColumn,
        createActionsColumn,
        createProgressColumn,
        createCustomColumn,
        createBooleanColumn,
        createNumberColumn,
        createCurrencyColumn,
        createLinkColumn,
        createTagsColumn,
        createJsonColumn,

    };
};
