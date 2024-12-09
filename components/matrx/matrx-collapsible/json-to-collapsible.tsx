'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {ArmaniCollapsibleGroup} from '@/components/matrx/matrx-collapsible';
import {MatrxRecordList} from '@/components/matrx/matrx-record-list';
import {MatrxBasicAutoTable} from '@/components/matrx/matrx-record-list';

interface JsonToCollapsibleProps {
    title: string | React.ReactNode;
    data: any;
    level?: number;  // Changed from baseLevel
    className?: string;
}

type CollapsibleItem = {
    title: string;
    content?: React.ReactNode;
    items?: CollapsibleItem[];
};

type ArrayRenderResult = {
    content?: React.ReactNode;
    items?: CollapsibleItem[];
};

const getStringTitle = (title: string | React.ReactNode): string => {
    if (typeof title === 'string') return title;
    if (typeof title === 'number') return String(title);
    if (React.isValidElement(title)) {
        // If it's a React element, try to get text content
        // This is a simple approach - you might want to enhance this
        // based on your specific needs
        const props = title.props as any;
        return props.children || 'Data';
    }
    return 'Data';
};

export function MatrxJsonToCollapsible(
    {
        title,
        data,
        level = 0,
        className
    }: JsonToCollapsibleProps) {
    const isSimpleArray = (arr: any[]): boolean =>
        Array.isArray(arr) && arr.every(item =>
            item === null ||
            item === undefined ||
            typeof item !== 'object'
        );

    const isObjectArray = (arr: any[]): boolean =>
        Array.isArray(arr) &&
        arr.length > 0 &&
        arr.every(item =>
            item !== null &&
            typeof item === 'object' &&
            !Array.isArray(item)
        );

    const isFlatObjectArray = (arr: any[]): boolean =>
        isObjectArray(arr) &&
        arr.every(item =>
            Object.values(item).every(v =>
                v === null ||
                v === undefined ||
                typeof v !== 'object'
            )
        );

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return 'No Data';
        if (typeof value === 'object') {
            if (!value || Object.keys(value).length === 0) {
                return Array.isArray(value) ? 'Empty Array' : 'Empty Object';
            }
            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return 'Invalid Data';
            }
        }
        return String(value);
    };

    const renderArray = (arr: any[], title: string): ArrayRenderResult => {
        if (!arr || arr.length === 0) {
            return {
                content: <div className="px-4 py-2 text-sm text-muted-foreground">Empty Array</div>
            };
        }

        if (isSimpleArray(arr)) {
            return {
                content: (
                    <div className="grid grid-cols-1 gap-1 px-4 py-2">
                        {arr.map((value, index) => (
                            <span key={index} className="text-sm text-foreground">
                            {formatValue(value)}
                        </span>
                        ))}
                    </div>
                )
            };
        }

        if (isFlatObjectArray(arr)) {
            return {
                content: (
                    <MatrxBasicAutoTable
                        data={arr}
                        density="compact"
                        size="xs"
                        showBorders={true}
                    />
                )
            };
        }

        if (isObjectArray(arr)) {
            return {
                items: arr.map((item, index) =>
                    processContent(item, `${title} ${index + 1}`)
                )
            };
        }

        return {
            content: (
                <div className="grid grid-cols-1 gap-1 px-4 py-2">
                    {arr.map((value, index) => (
                        <span key={index} className="text-sm text-foreground">
                        {formatValue(value)}
                    </span>
                    ))}
                </div>
            )
        };
    };

    const processContent = (currentData: any, currentTitle: string): CollapsibleItem => {
        // Handle null/undefined
        if (currentData === null || currentData === undefined) {
            return {
                title: currentTitle,
                content: (
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                        No Data
                    </div>
                )
            };
        }

        // Handle primitives
        if (typeof currentData !== 'object') {
            return {
                title: currentTitle,
                content: (
                    <div className="px-4 py-2 text-sm text-foreground">
                        {formatValue(currentData)}
                    </div>
                )
            };
        }

        // Handle empty objects/arrays
        if (Object.keys(currentData).length === 0) {
            return {
                title: currentTitle,
                content: (
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                        {Array.isArray(currentData) ? 'Empty Array' : 'Empty Object'}
                    </div>
                )
            };
        }

        // For arrays
        if (Array.isArray(currentData)) {
            const arrayResult = renderArray(currentData, currentTitle);
            return {
                title: currentTitle,
                content: arrayResult.content,
                items: arrayResult.items
            };
        }

        // For objects
        const flatData: Record<string, any> = {};
        const complexData: Array<[string, any]> = [];

        Object.entries(currentData).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
                complexData.push([key, value]);
            } else {
                flatData[key] = value;
            }
        });

        // Process complex data as items
        const items = complexData.map(([key, value]) =>
            processContent(value, key)
        );

        // Return item with both content and items if they exist
        return {
            title: currentTitle,
            content: Object.keys(flatData).length > 0 ? (
                <MatrxRecordList
                    records={{data: flatData}}
                    fields={Object.keys(flatData).map(key => ({
                        name: key,
                        displayName: key
                    }))}
                    density="compact"
                    size="xs"
                    showBorders={true}
                />

            ) : undefined,
            items: items.length > 0 ? items : undefined
        };
    };

    if (!data) {
        return (
            <div className={cn("px-4 py-2 text-sm text-muted-foreground", className)}>
                No Data Available
            </div>
        );
    }

    const processedData = processContent(data, getStringTitle(title));

    return (
        <div className={cn("w-full", className)}>
            <ArmaniCollapsibleGroup
                title={processedData.title}
                content={processedData.content}
                items={processedData.items}
                level={level}
                id={`json-collapsible-${title}`}
            />
        </div>
    );
}

export default MatrxJsonToCollapsible;
