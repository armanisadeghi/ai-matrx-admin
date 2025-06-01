// types/table/columnTypes.ts
import { ButtonProps } from "@/components/ui/ButtonMine";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { ComponentType } from "react";

// Button-related types
export type ButtonVariant = NonNullable<ButtonProps["variant"]>;
export type ButtonSize = NonNullable<ButtonProps["size"]>;

// Base column interface
interface BaseColumnOptions {
    key: string;
    title: string;
}

// Simple columns
export type SelectColumnOptions = {
    type: "select"
};

export type DataColumnOptions = {
    type: "data";
    options: BaseColumnOptions;
};

// Display formatting columns
export type StatusColumnOptions = {
    type: "status";
    options: BaseColumnOptions & {
        states: Record<string, {
            label: string;
            color: "default" | "destructive" | "outline" | "secondary" | "warning";
        }>;
    };
};

export type DateTimeColumnOptions = {
    type: "datetime";
    options: BaseColumnOptions & {
        format?: "relative" | "absolute";
        showTime?: boolean;
    };
};

export type BooleanColumnOptions = {
    type: "boolean";
    options: BaseColumnOptions & {
        trueLabel?: string;
        falseLabel?: string;
        icon?: boolean;
    };
};

export type CurrencyColumnOptions = {
    type: "currency";
    options: BaseColumnOptions & {
        currency?: string;
        locale?: string;
    };
};

// Complex data columns
export type TagsColumnOptions = {
    type: "tags";
    options: BaseColumnOptions & {
        maxDisplay?: number;
        colors?: Record<string, string>;
    };
};

export type JsonColumnOptions = {
    type: "json";
    options: BaseColumnOptions & {
        expandable?: boolean;
    };
};

// Interactive columns
export type ActionsColumnOptions = {
    type: "actions";
    options: {
        actions: Array<{
            label: string;
            icon?: ComponentType<{ className?: string }>;
            onClick: (row: any) => void;
            variant?: ButtonVariant;
            size?: ButtonSize;
            className?: string;
        }>;
        containerClassName?: string;
    };
};

export type CustomColumnOptions<TEntity extends EntityKeys> = {
    type: "custom";
    options: BaseColumnOptions & {
        render: (value: any, row: EntityData<TEntity>) => React.ReactNode;
    };
};

// Union type of all column options
export type ColumnOptions =
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


// Utility types
export type FilterVariant = 'text' | 'range' | 'select';

// Column specific types
export type FilterOptions = {
    variant: FilterVariant;
    options?: string[];
    placeholder?: string;
};

export interface ColumnBase {
    key: string;
    title: string;
    filter?: FilterOptions;
}

export interface DataColumn extends ColumnBase {
    truncate?: boolean;
    maxWidth?: string;
}

export interface StatusColumn extends ColumnBase {
    states: Record<string, {
        label: string;
        color: "default" | "destructive" | "outline" | "secondary" | "warning";
    }>;
}

export interface ActionColumn<TEntity extends EntityKeys> {
    actions: Array<{
        id?: string;
        label: string;
        icon?: ComponentType<{ className?: string }>;
        onClick: (row: EntityData<TEntity>) => void;
        variant?: ButtonVariant;
        size?: ButtonSize;
        className?: string;
    }>;
    containerClassName?: string;
}


// Column Definitions
export type ColumnDefinition<TEntity extends EntityKeys> = {
    select: never;
    data: DataColumn;
    status: StatusColumn;
    action: ActionColumn<TEntity>;
    // ... other column types ...
};
