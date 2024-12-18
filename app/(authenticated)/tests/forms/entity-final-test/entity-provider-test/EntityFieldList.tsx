'use client';

import * as React from 'react';
import {ScrollArea} from "@/components/ui/scroll-area";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {createEntitySelectors, useAppSelector} from "@/lib/redux";
import {EntityKeys} from '@/types';
import {useMeasure} from "@uidotdev/usehooks";

interface FieldListProps {
    entityName: EntityKeys;
    mappings: Record<string, string> | undefined;
}

const useEntitySelectors = (entityName: EntityKeys) => {
    // Remove unnecessary memoization
    const selectors = entityName ? createEntitySelectors(entityName) : null;

    const selectedRecordIds = useAppSelector(
        selectors ? selectors.selectSelectedRecordIds : () => []
    );
    const selectedRecords = useAppSelector(
        selectors ? selectors.selectSelectedRecords : () => []
    );

    return {
        selectedRecordIds,
        selectedRecords,
        selectors
    };
};


function EntityFieldList({entityName, mappings}: FieldListProps) {
    const [ref, {width, height}] = useMeasure();
    const fieldCardHeight = height - 16;

    const {selectedRecordIds, selectedRecords, selectors} = useEntitySelectors(entityName);

    console.log("--- selected records", selectedRecords)

    const uniqueFields = React.useMemo(() => {
        if (!mappings) return [];
        const uniqueValues = new Set(Object.values(mappings));
        return Array.from(uniqueValues).sort();
    }, [mappings]);

    if (!mappings) {
        return (
            <Card className="p-4">
                <div className="text-muted-foreground">
                    Select an entity to view fields
                </div>
            </Card>
        );
    }

    return (
        <Card ref={ref}>
            <CardHeader>
                <CardTitle>Canonical Fields</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className={`h-[${fieldCardHeight}px] pr-4`}>
                    <div className="space-y-2">
                        {uniqueFields.map((field) => (
                            <div
                                key={field}
                                className="p-2 rounded-lg bg-muted"
                            >
                                {field}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export {EntityFieldList};