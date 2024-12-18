'use client';

import * as React from 'react';
import {EntityKeys} from '@/types/entityTypes';
import EntityQuickReferenceFinal from '../QuickReferenceFinal';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {EntityFieldList} from './EntityFieldList';
import {fieldNameToCanonical} from '@/utils/schema/lookupSchema';
import {EntityContextProvider, useEntityContext} from '@/providers/EntityContextProvider';

function TestQuickReferenceContent() {
    const {activeEntityName, switchActiveEntity} = useEntityContext();

    const entityNames = React.useMemo(() =>
            Object.keys(fieldNameToCanonical) as EntityKeys[],
        []
    );

    const handleEntityChange = React.useCallback((value: string) => {
        switchActiveEntity(value as EntityKeys);
    }, [switchActiveEntity]);

    const currentMappings = React.useMemo(() =>
            activeEntityName ? fieldNameToCanonical[activeEntityName] : undefined,
        [activeEntityName]
    );

    return (
        <div className="flex flex-col w-full h-full min-h-0">
            <div className="w-72 mb-4">
                <Select
                    value={activeEntityName}
                    onValueChange={handleEntityChange}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select entity"/>
                    </SelectTrigger>
                    <SelectContent>
                        {entityNames.map((name) => (
                            <SelectItem key={name} value={name}>
                                {name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-row gap-4 flex-1 min-h-0">
                <div className="w-1/5 min-w-[250px] overflow-y-auto border-r border-border">
                    <EntityQuickReferenceFinal
                        entityKey={activeEntityName}
                        className="h-full pr-4"
                    />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    <EntityFieldList
                        entityName={activeEntityName}
                        mappings={currentMappings}
                    />
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    const emptyRelationshipMap = React.useMemo(() => ({}), []);
    const initialEntity = React.useMemo(() =>
            (Object.keys(fieldNameToCanonical)[0] as EntityKeys),
        []
    );

    return (
        <EntityContextProvider
            initialEntity={initialEntity}
            relationshipMap={emptyRelationshipMap}
        >
            <TestQuickReferenceContent/>
        </EntityContextProvider>
    );
}