'use client';
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { EntityKeys } from '@/types/entityTypes';
import { useQuickReference } from '@/lib/redux/entity/hooks/useQuickReference';
import { MatrxRecordId } from "@/lib/redux/entity/types";
import { cn } from '@/utils/cn';

interface QuickRefBasicProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSelectionChange?: (recordId: MatrxRecordId | MatrxRecordId[]) => void;
    className?: string;
}

export function QuickRefScrollBasic<TEntity extends EntityKeys>(
    {
        entityKey,
        className = ''
    }: QuickRefBasicProps<TEntity>) {
    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        getCardClassName,
    } = useQuickReference(entityKey);

    return (
        <div className={cn('h-full flex flex-col border-r', className)}>
            <ScrollArea className="flex-grow">
                <div className="p-2 space-y-2">
                    {quickReferenceRecords.map(ref => (
                        <Card
                            key={ref.recordKey}
                            className={cn(getCardClassName(ref.recordKey))}
                            onClick={() => handleRecordSelect(ref.recordKey)}
                        >
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    {selectionMode === 'multiple' && (
                                        <Checkbox
                                            checked={isSelected(ref.recordKey)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                    <div className="text-sm">
                                        {ref.displayValue}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

export function QuickRefCardBasic<TEntity extends EntityKeys>(
    {
        entityKey,
        className = ''
    }: QuickRefBasicProps<TEntity>) {
    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        getCardClassName,
    } = useQuickReference(entityKey);

    return (
        <div className={cn('p-2 space-y-2', className)}>
            {quickReferenceRecords.map(ref => (
                <Card
                    key={ref.recordKey}
                    className={cn(getCardClassName(ref.recordKey))}
                    onClick={() => handleRecordSelect(ref.recordKey)}
                >
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            {selectionMode === 'multiple' && (
                                <Checkbox
                                    checked={isSelected(ref.recordKey)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                            <div className="text-sm">
                                {ref.displayValue}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
