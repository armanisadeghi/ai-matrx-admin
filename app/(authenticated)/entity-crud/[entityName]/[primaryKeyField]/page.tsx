'use client';

import {EntityKeys} from '@/types/entityTypes';
import {ResizablePanel} from '@/components/ui/resizable';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Search, Plus} from 'lucide-react';
import {useCallback, useMemo, useState} from "react";
import {cn} from '@/utils';
import {Card, CardContent} from '@/components/ui/card';
import {useQuickReference} from "@/lib/redux/entity/hooks/useQuickReference";
import { use } from 'react';

type Params = Promise<{
    entityName: EntityKeys;
    primaryKeyField: string;
}>;

type SearchParams = Promise<{
    entityPrettyName: string;
    [key: string]: string | string[] | undefined;
}>;

interface EntityQuickReferencePageProps {
    params: Params;
    searchParams: SearchParams;
}

export default function EntityQuickReferencePage(props: EntityQuickReferencePageProps) {
    // Use React.use instead of await for client components
    const params = use(props.params);
    const searchParams = use(props.searchParams);

    const [searchTerm, setSearchTerm] = useState('');

    const {
        quickReferenceRecords,
        selectionMode,
        isSelected,
        handleRecordSelect,
        toggleSelectionMode,
    } = useQuickReference(params.entityName);

    const filteredRecords = useMemo(() => {
        if (!searchTerm) return quickReferenceRecords;
        return quickReferenceRecords.filter(record =>
            record.displayValue.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [quickReferenceRecords, searchTerm]);

    const getCardClassName = useCallback((recordKey: string) => {
        const baseClasses = "cursor-pointer transition-colors hover:bg-accent/50";
        const isMultiple = selectionMode === 'multiple';
        return cn(
            baseClasses,
            isSelected(recordKey)
            ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}`
            : 'border-transparent'
        );
    }, [selectionMode, isSelected]);

    return (
        <div className="flex h-full">
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                        <div className="relative mb-4">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                            <Input
                                placeholder={`Search ${searchParams.entityPrettyName}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <div className="flex gap-2">
                            {selectionMode !== 'none' && (
                                <Button
                                    onClick={toggleSelectionMode}
                                    size="sm"
                                    variant={selectionMode === 'multiple' ? "secondary" : "outline"}
                                >
                                    Multi Select
                                </Button>
                            )}
                            <Button className="w-full">
                                <Plus className="h-4 w-4 mr-2"/>
                                New {searchParams.entityPrettyName}
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="flex-grow">
                        <div className="p-2 space-y-2">
                            {filteredRecords.map(record => (
                                <Card
                                    key={record.recordKey}
                                    className={getCardClassName(record.recordKey)}
                                    onClick={() => handleRecordSelect(record.recordKey)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm">
                                                {record.displayValue}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </ResizablePanel>

            <div className="flex-1 p-6">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a record to view details
                </div>
            </div>
        </div>
    );
}
