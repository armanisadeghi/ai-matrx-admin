// components/matrix/SchemaTable/EntitySelectors.tsx
import React, {useState} from 'react';
import {Card, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {EntityKeys, EntitySelectOption} from '@/types/entityTypes';

import {cn} from '@/lib/utils';
import {EntitySelectStyle} from "@/types/componentConfigTypes";

// Base Select Component (reusable across all variations)
interface EntitySelectBaseProps<TEntity extends EntityKeys> {
    value: TEntity | undefined;
    options: EntitySelectOption<TEntity>[];
    onValueChange: (value: TEntity) => void;
    className?: string;
}

const EntitySelectBase = <TEntity extends EntityKeys>(
    {
        value,
        options,
        onValueChange,
        className
    }: EntitySelectBaseProps<TEntity>) => (
    <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("bg-card text-card-foreground border-matrxBorder", className)}>
            <SelectValue placeholder="Select Entity..."/>
        </SelectTrigger>
        <SelectContent>
            {options.map(({value, label}) => (
                <SelectItem
                    key={value}
                    value={value}
                    className="bg-card text-card-foreground hover:bg-muted"
                >
                    {label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

// 1. Minimal Version (Just the select, no extra UI)
export const MinimalEntitySelect = <TEntity extends EntityKeys>(props: EntitySelectBaseProps<TEntity>) => (
    <EntitySelectBase {...props} className="w-[280px]"/>
);

// 2. Compact Version (Small header with select)
export const CompactEntitySelect = <TEntity extends EntityKeys>(props: EntitySelectBaseProps<TEntity>) => (
    <div className="flex items-center gap-2 p-2 border rounded-md">
        <span className="text-sm font-medium text-muted-foreground">Entity:</span>
        <EntitySelectBase {...props} className="w-[240px]"/>
    </div>
);

// 3. Standard Card Version (Original design)
export const CardEntitySelect = <TEntity extends EntityKeys>(props: EntitySelectBaseProps<TEntity>) => {
    const title = props.value
                  ? props.options.find(opt => opt.value === props.value)?.label
                  : 'Select Entity';

    return (
        <CardHeader
            className="border-2 border-gray-500 flex flex-col lg:flex-row items-center justify-between p-4 lg:p-6 space-y-4 lg:space-y-0 min-h-[6rem] lg:h-24">
            <div className="flex flex-col justify-center text-center lg:text-left">
                <CardTitle className="text-lg lg:text-xl">{title}</CardTitle>
                <CardDescription className="text-sm lg:text-base">
                    Browse & Manage Entities
                </CardDescription>
            </div>
            <EntitySelectBase {...props} className="w-[280px] lg:w-[400px] h-10 lg:h-12"/>
        </CardHeader>
    );
};

// 4. Prominent Version (High-profile design)
export const ProminentEntitySelect = <TEntity extends EntityKeys>(props: EntitySelectBaseProps<TEntity>) => {
    const title = props.value
                  ? props.options.find(opt => opt.value === props.value)?.label
                  : 'Select Entity';

    return (
        <div
            className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-900">
            <div className="space-y-6">
                <div className="flex flex-col items-center text-center space-y-2">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {title}
                    </h2>
                    <p className="text-muted-foreground">Select an entity to begin</p>
                </div>
                <EntitySelectBase {...props} className="w-full max-w-2xl mx-auto h-12"/>
            </div>
        </div>
    );
};

// 5. Inline Version (For tight spaces)
export const InlineEntitySelect = <TEntity extends EntityKeys>(props: EntitySelectBaseProps<TEntity>) => (
    <div className="inline-flex items-center gap-2">
        <EntitySelectBase {...props} className="w-[200px]"/>
    </div>
);

// 6. Floating Version (With shadow and hover effects)
export const FloatingEntitySelect = <TEntity extends EntityKeys>(props: EntitySelectBaseProps<TEntity>) => (
    <div
        className="p-4 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-muted">
        <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-lg">Entity Selection</h3>
            <EntitySelectBase {...props} className="w-full"/>
        </div>
    </div>
);


interface EntitySelectWrapperProps<TEntity extends EntityKeys> extends EntitySelectBaseProps<TEntity> {
    variant?: EntitySelectStyle;
}

export const EntitySelect = <TEntity extends EntityKeys>(
    {
        variant = 'card',
        ...props
    }: EntitySelectWrapperProps<TEntity>) => {
    const Components = {
        minimal: MinimalEntitySelect,
        compact: CompactEntitySelect,
        card: CardEntitySelect,
        prominent: ProminentEntitySelect,
        inline: InlineEntitySelect,
        floating: FloatingEntitySelect,
    };

    const SelectedComponent = Components[variant];
    return <SelectedComponent {...props} />;
};
