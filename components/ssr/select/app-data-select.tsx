// SelectComponents.tsx
import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getCategoriesForSelect,
    getDataForSelect,
    getDataByCategoryForSelect,
    CategoryOptions
} from './constants';

// Server Components
export async function CategorySelect({
                                         defaultValue,
                                         className
                                     }: {
    defaultValue?: string;
    className?: string;
}) {
    const categories = await getCategoriesForSelect();

    return (
        <Select defaultValue={defaultValue}>
            <SelectTrigger className={className}>
                <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
                {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                        {category.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export async function DataSetSelect({
                                        defaultValue,
                                        className
                                    }: {
    defaultValue?: string;
    className?: string;
}) {
    const dataSets = await getDataForSelect();

    return (
        <Select defaultValue={defaultValue}>
            <SelectTrigger className={className}>
                <SelectValue placeholder="Select a data set" />
            </SelectTrigger>
            <SelectContent>
                {dataSets.map((set) => (
                    <SelectItem key={set.value} value={set.value}>
                        {set.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export async function CategoryDataSelect({
                                             category,
                                             defaultValue,
                                             className
                                         }: {
    category: CategoryOptions;
    defaultValue?: string;
    className?: string;
}) {
    const dataSets = await getDataByCategoryForSelect(category);

    return (
        <Select defaultValue={defaultValue}>
            <SelectTrigger className={className}>
                <SelectValue placeholder="Select data from category" />
            </SelectTrigger>
            <SelectContent>
                {dataSets.map((set) => (
                    <SelectItem key={set.key} value={set.key}>
                        {set.displayName}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}


/*
// Client wrapper for when you need onChange handling
'use client';

export function ClientSelectWrapper({
                                        children,
                                        onValueChange,
                                    }: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
}) {
    return (
        <div onChange={(e: any) => onValueChange(e.target.value)}>
            {children}
        </div>
    );
}*/
