/*
// app/(authenticated)/entity-crud/[entityName]/[primaryKeyField]/page.tsx
'use client';

import {EntityKeys} from '@/types/entityTypes';
import {ResizablePanel} from '@/components/ui/resizable';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Search, Plus, ArrowRight} from 'lucide-react';
import Link from 'next/link';
import {useCallback, useMemo, useState} from "react";
import {QuickReferenceRecord} from "@/lib/redux/entity/types";
import {cn} from '@/utils';
import EntityFormWrapper from '@/components/matrx/Entity/form/EntityFormWrapper';
import {useQuickReference} from "@/lib/redux/entity/hooks/useQuickReference";

interface EntityQuickReferenceSidebarProps<TEntity extends EntityKeys> {
    records: QuickReferenceRecord[];
    onRecordSelect: (record: QuickReferenceRecord) => void;
    activeRecordKey?: string;
    entityPrettyName: string;
}

function EntityQuickReferenceSidebar<TEntity extends EntityKeys>(
    {
        records,
        onRecordSelect,
        activeRecordKey,
        entityPrettyName
    }: EntityQuickReferenceSidebarProps<TEntity>) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRecords = useMemo(() => {
        if (!searchTerm) return records;
        return records.filter(record =>
            record.displayValue.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [records, searchTerm]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                    <Input
                        placeholder={`Search ${entityPrettyName}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="space-y-1 p-2">
                    {filteredRecords.map((record) => (
                        <button
                            key={JSON.stringify(record.primaryKeyValues)}
                            onClick={() => onRecordSelect(record)}
                            className={cn(
                                "w-full text-left px-2 py-1 rounded-md hover:bg-accent",
                                activeRecordKey === JSON.stringify(record.primaryKeyValues) &&
                                "bg-accent text-accent-foreground"
                            )}
                        >
                            {record.displayValue}
                        </button>
                    ))}
                </div>
            </ScrollArea>
            <div className="p-4 border-t">
                <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2"/>
                    New {entityPrettyName}
                </Button>
            </div>
        </div>
    );
}

interface EntityQuickReferencePageProps {
    params: {
        entityName: EntityKeys;
        primaryKeyField: string;
    };
    searchParams: {
        entityPrettyName: string;
    };
}

export default function EntityQuickReferencePage(
    {
        params,
        searchParams
    }: EntityQuickReferencePageProps) {
    const {
        quickReferenceRecords,
        activeRecord,
        loadingState,
        updateRecord,
        deleteRecord,
        handleRecordSelect,
    } = useQuickReference(params.entityName);


    return (
        <div className="flex h-full">
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <EntityQuickReferenceSidebar
                    records={quickReferenceRecords}
                    onRecordSelect={handleRecordSelect}
                    activeRecordKey={activeRecord ? JSON.stringify(activeRecord) : undefined}
                    entityPrettyName={searchParams.entityPrettyName}
                />
            </ResizablePanel>

            <div className="flex-1 p-6">
                {activeRecord ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-semibold">
                                {activeRecord[entityMetadata?.displayField?.fieldName || '']}
                            </h2>
                            <Link
                                href={`/entity-crud/${params.entityName}/table?entityPrettyName=${
                                    encodeURIComponent(searchParams.entityPrettyName)
                                }`}
                                className="flex items-center text-sm text-muted-foreground hover:text-primary"
                            >
                                View in Table
                                <ArrowRight className="ml-2 h-4 w-4"/>
                            </Link>
                        </div>

                        <EntityFormWrapper
                            entity={params.entityName}
                            entityName={params.entityName}
                        />
                    </div>
                ) : (
                     <div className="flex items-center justify-center h-full text-muted-foreground">
                         Select a record to view details
                     </div>
                 )}
            </div>
        </div>
    );
}
*/
