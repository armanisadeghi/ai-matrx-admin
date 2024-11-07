// components/table/tableBuilder.tsx
'use client';
import { createTableColumnDefinitions, ColumnType } from './columnDefinitions';
import { ColumnDef } from "@tanstack/react-table";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import {ButtonProps} from "@/components/ui/button";

type SelectColumnOptions = { type: "select" };
type ButtonVariant = NonNullable<ButtonProps["variant"]>;
type ButtonSize = NonNullable<ButtonProps["size"]>;

type DataColumnOptions = {
    type: "data";
    options: {
        key: string;
        title: string;
    };
};

type StatusColumnOptions = {
    type: "status";
    options: {
        key: string;
        title: string;
        states: Record<string, {
            label: string;
            color: "default" | "destructive" | "outline" | "secondary" | "warning";
        }>;
    };
};

type DateTimeColumnOptions = {
    type: "datetime";
    options: {
        key: string;
        title: string;
        format?: "relative" | "absolute";
        showTime?: boolean;
    };
};

type ActionsColumnOptions = {
    type: "actions";
    options: {
        actions: Array<{
            label: string;
            icon?: React.ComponentType<{ className?: string }>;
            onClick: (row: any) => void;
            variant?: ButtonVariant;
            size?: ButtonSize;
            className?: string;
        }>;
        containerClassName?: string;
    };
};

type BooleanColumnOptions = {
    type: "boolean";
    options: {
        key: string;
        title: string;
        trueLabel?: string;
        falseLabel?: string;
        icon?: boolean;
    };
};

type CurrencyColumnOptions = {
    type: "currency";
    options: {
        key: string;
        title: string;
        currency?: string;
        locale?: string;
    };
};

type TagsColumnOptions = {
    type: "tags";
    options: {
        key: string;
        title: string;
        maxDisplay?: number;
        colors?: Record<string, string>;
    };
};
// Add missing options types
type JsonColumnOptions = {
    type: "json";
    options: {
        key: string;
        title: string;
        expandable?: boolean;
    };
};

type CustomColumnOptions<TEntity extends EntityKeys> = {
    type: "custom";
    options: {
        key: string;
        title: string;
        render: (value: any, row: EntityData<TEntity>) => React.ReactNode;
    };
};

type ColumnOptions =
    | SelectColumnOptions
    | DataColumnOptions
    | StatusColumnOptions
    | DateTimeColumnOptions
    | ActionsColumnOptions
    | BooleanColumnOptions
    | CurrencyColumnOptions
    | TagsColumnOptions
    | JsonColumnOptions
    | CustomColumnOptions<any>;

export const buildTableColumns = <TEntity extends EntityKeys>(
    columns: ColumnOptions[]
): ColumnDef<EntityData<TEntity>>[] => {
    const {
        createSelectColumn,
        createDataColumn,
        createStatusColumn,
        createDateTimeColumn,
        createActionsColumn,
        createBooleanColumn,
        createCurrencyColumn,
        createTagsColumn,
        createProgressColumn,
        createJsonColumn,
        createCustomColumn,
    } = createTableColumnDefinitions<TEntity>();

    return columns.map((column) => {
        switch (column.type) {
            case "select":
                return createSelectColumn();
            case "data":
                return createDataColumn(column.options);
            case "status":
                return createStatusColumn(column.options);
            case "datetime":
                return createDateTimeColumn(column.options);
            case "actions":
                return createActionsColumn(column.options);
            case "boolean":
                return createBooleanColumn(column.options);
            case "currency":
                return createCurrencyColumn(column.options);
            case "tags":
                return createTagsColumn(column.options);
            // case "progress":
            //     return createProgressColumn(column.options);
            case "json":
                return createJsonColumn(column.options);
            case "custom":
                return createCustomColumn(column.options);
            default:
                throw new Error(`Unsupported column type: ${(column as any).type}`);
        }
    });
};

export const buildColumnsFromTableColumns = <TEntity extends EntityKeys>(
    tableColumns: Array<{ key: string; title: string }>,
    additionalColumns: ColumnOptions[] = []
) => {
    const basicColumns = tableColumns.map(col => ({
        type: "data" as const,
        options: {
            key: col.key,
            title: col.title,
        }
    }));

    return buildTableColumns<TEntity>([
        { type: "select" },
        ...basicColumns,
        ...additionalColumns
    ]);
};



export const registeredFunctionColumns = buildTableColumns<"registeredFunction">([
    { type: "select" },
    {
        type: "data",
        options: {
            key: "name",
            title: "Name"
        }
    },
    {
        type: "status",
        options: {
            key: "status",
            title: "Status",
            states: {
                active: { label: "Active", color: "secondary" },
                inactive: { label: "Inactive", color: "default" },
                pending: { label: "Pending", color: "warning" }
            }
        }
    },
    {
        type: "datetime",
        options: {
            key: "createdAt",
            title: "Created",
            format: "relative"
        }
    },
    {
        type: "actions",
        options: {
            actions: [
                {
                    label: "Edit",
                    onClick: (row) => console.log("Edit", row),
                    variant: "outline",
                    size: "xs"
                },
                {
                    label: "Delete",
                    variant: "destructive",
                    size: "xs",
                    onClick: (row) => console.log("Delete", row),
                }
            ]
        }
    }
]);

export const userPreferencesColumns = buildTableColumns<"userPreferences">([
    { type: "select" },
    {
        type: "boolean",
        options: {
            key: "isActive",
            title: "Status",
            icon: true
        }
    },
    {
        type: "currency",
        options: {
            key: "revenue",
            title: "Revenue",
            currency: "EUR"
        }
    },
    {
        type: "tags",
        options: {
            key: "roles",
            title: "Roles",
            maxDisplay: 3,
            colors: {
                admin: "text-red-500",
                user: "text-blue-500"
            }
        }
    }
]);
