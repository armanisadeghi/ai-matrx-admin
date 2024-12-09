'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import { MatrxJsonToCollapsible } from '@/components/matrx/matrx-collapsible';
import {EntityKeys} from '@/types/entityTypes';
import {useEntityAnalyzer} from '@/lib/redux/entity/hooks/useEntityAnalyzer';
import {Card, CardContent} from '@/components/ui/card';

interface EntityJsonAutoAnalyzerProps {
    entityKey: EntityKeys;
    className?: string;
}

export function EntityJsonAutoAnalyzer(
    {
        entityKey,
        className
    }: EntityJsonAutoAnalyzerProps) {
    const {
        sections,
        getEntityLabel
    } = useEntityAnalyzer(entityKey);

    if (!sections.length) return null;

    return (
        <Card className={cn("w-full", className)}>
            <CardContent className="space-y-4 p-4">
                {sections.map((section) => (
                    <MatrxJsonToCollapsible
                        key={section.id}
                        title={section.title}
                        data={section.data}
                        level={0}
                    />
                ))}
            </CardContent>
        </Card>
    );
}

export default EntityJsonAutoAnalyzer;
