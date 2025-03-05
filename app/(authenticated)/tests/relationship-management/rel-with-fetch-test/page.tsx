'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MatrxDynamicPanel from '@/components/matrx/resizable/MatrxDynamicPanel';
import EnhancedEntityAnalyzer from '@/components/admin/redux/EnhancedEntityAnalyzer';
import ChildRecordsCard from './ChildRecordCard';
import QuickRefSelect from '@/app/entities/quick-reference/QuickRefSelectFloatingLabel';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { createRelationshipDefinition, RelationshipDefinitionInput } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import EntityJsonBuilder from './EntityJsonBuilder';
import { useRelFetchProcessing } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';

// Define the relationship inputs as constants
const RELATIONSHIP_INPUTS: Record<string, RelationshipDefinitionInput> = {
    aiAgent: {
        relationshipKey: 'aiAgent',
        parent: 'recipe',
        child: 'aiSettings',
    },
    recipeMessage: {
        relationshipKey: 'recipeMessage',
        parent: 'recipe',
        child: 'messageTemplate',
        orderField: 'order',
    },
    messageBroker: {
        relationshipKey: 'messageBroker',
        parent: 'messageTemplate',
        child: 'dataBroker',
    },
} as const;

export default function RelationshipTester() {
    // Get initial definitions list
    const availableDefinitions = useMemo(
        () =>
            Object.entries(RELATIONSHIP_INPUTS).map(([key, input]) => ({
                key,
                input,
                definition: createRelationshipDefinition(input),
            })),
        []
    );

    // State management
    const [selectedKey, setSelectedKey] = useState<string>(availableDefinitions[0].key);
    const [inputParentId, setInputParentId] = useState('');
    const [activeParentId, setActiveParentId] = useState('');
    const [selectedChildId, setSelectedChildId] = useState<string>('');
    const [childDataInput, setChildDataInput] = useState('');
    const [joinDataInput, setJoinDataInput] = useState('');

    // Get current definition
    const currentDefinition = useMemo(() => availableDefinitions.find((def) => def.key === selectedKey)?.definition, [selectedKey, availableDefinitions]);

    const {
        // Entity names
        parentEntity,
        joiningEntity,
        childEntity,

        // Entity tools
        parentTools,
        joinTools,
        childTools,

        // Parent data
        parentId,
        parentRecord,
        parentMatrxid,

        // Join/Relationship data
        joinIds,
        joinRecords,
        joiningMatrxIds,

        // Child data
        childIds,
        childMatrxIds,
        unprocessedChildRecords,
        childRecords,

        // Loading state
        isLoading,
        loadingState,

        deleteChildAndJoin,
        createRelatedRecords,
        triggerProcessing,
    } =
        useRelFetchProcessing(currentDefinition!, activeParentId);

    const handleDefinitionChange = (key: string) => {
        setSelectedKey(key);
        // Reset states when definition changes
        setInputParentId('');
        setActiveParentId('');
        setSelectedChildId('');
        setChildDataInput('');
        setJoinDataInput('');
    };

    const handleLoadData = () => {
        setActiveParentId(inputParentId);
    };

    const handleCreate = async () => {
        try {
            // Validate and parse JSON input strings
            const childData = childDataInput ? JSON.parse(childDataInput) : {};
            const joinData = joinDataInput ? JSON.parse(joinDataInput) : {};
            const filter = true;

            // Call the async function
            const result = await createRelatedRecords(
                {
                    child: childData,
                    joining: joinData,
                },
                {
                    onSuccess: (result) => {
                        console.log('Relationship created successfully:', result);
                        setChildDataInput('');
                        setJoinDataInput('');
                    },
                    onError: (error) => {
                        console.error('Failed to create relationship:', error);
                    },
                },
                filter
            );

            // Validate and log the result
            if (!result) {
                throw new Error('Failed to create related records: No result returned');
            }

            const { childRecord, joinRecord, childMatrxRecordId } = result;

            console.log('Created relationship:', result);
            console.log('Created child record:', childRecord);
            console.log('Created join record:', joinRecord);
            console.log('Child MatrxRecordId:', childMatrxRecordId);
        } catch (error) {
            // Log errors for JSON parsing or API call failures
            if (error instanceof SyntaxError) {
                console.error('Failed to parse JSON data:', error.message);
            } else {
                console.error('Error during relationship creation:', error.message);
            }
        }
    };

    const handleParentChange = (record: QuickReferenceRecord) => {
        setInputParentId(record.primaryKeyValues.id);
        setActiveParentId(record.primaryKeyValues.id);
    };

    if (!currentDefinition) return null;

    return (
        <div className='p-4 w-full space-y-4'>
            {/* Top Entry Section */}
            <Card className='bg-card'>
                <CardHeader>
                    <CardTitle>Relationship Testing Interface</CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-2 gap-4'>
                    {/* Definition Selector */}
                    <div className='col-span-2 space-y-2'>
                        <label className='text-sm font-medium'>Relationship Definition</label>
                        <Select
                            value={selectedKey}
                            onValueChange={handleDefinitionChange}
                        >
                            <SelectTrigger className='w-full'>
                                <SelectValue placeholder='Select relationship definition' />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDefinitions.map(({ key, definition }) => (
                                    <SelectItem
                                        key={key}
                                        value={key}
                                    >
                                        {key} ({definition.parent.name} ↔ {definition.child.name})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className='col-span-2 space-y-2'>
                        <label className='text-sm font-medium'>Parent ID</label>
                        <div className='flex gap-2'>
                            <QuickRefSelect
                                entityKey={currentDefinition.parent.name}
                                onRecordChange={handleParentChange}
                            />
                            <Input
                                value={inputParentId}
                                onChange={(e) => setInputParentId(e.target.value)}
                                placeholder='Enter parent ID'
                                className='flex-1 min-w-[300px]'
                            />
                            <Button
                                onClick={handleLoadData}
                                disabled={!inputParentId}
                            >
                                Load Data
                            </Button>
                        </div>
                    </div>

                    <EntityJsonBuilder
                        entity={currentDefinition.child.name}
                        label={`Child Data (${currentDefinition.child.name})`}
                        value={childDataInput}
                        onChange={setChildDataInput}
                    />
                    <EntityJsonBuilder
                        entity={currentDefinition.join.name}
                        label={`Join Data (${currentDefinition.join.name})`}
                        value={joinDataInput}
                        onChange={setJoinDataInput}
                    />
                </CardContent>
                <CardFooter className='flex justify-end gap-2'>
                    <Button
                        variant='destructive'
                        onClick={() => selectedChildId && deleteChildAndJoin(selectedChildId)}
                        disabled={!selectedChildId}
                    >
                        Delete Selected
                    </Button>
                    <Button
                        variant='default'
                        onClick={handleCreate}
                        disabled={(!childDataInput && !joinDataInput) || !activeParentId}
                    >
                        Create New Record
                    </Button>
                </CardFooter>
            </Card>

            {/* Debug Section - Three Columns */}
            <div className='grid grid-cols-3 gap-4'>
                {/* Status Column */}
                <Card className='bg-card'>
                    <CardHeader>
                        <CardTitle>Status Information</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div>
                            <label className='text-sm font-medium block'>Active Parent ID</label>
                            <pre className='mt-1 bg-muted p-2 rounded-md'>{activeParentId || 'None'}</pre>
                        </div>
                        <div>
                            <label className='text-sm font-medium block'>Parent MatrxID</label>
                            <pre className='mt-1 bg-muted p-2 rounded-md'>{parentMatrxid || 'None'}</pre>
                        </div>
                        <div>
                            <label className='text-sm font-medium block'>Child Records</label>
                            <Select
                                value={selectedChildId}
                                onValueChange={setSelectedChildId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Select child record' />
                                </SelectTrigger>
                                <SelectContent>
                                    {childRecords.map((record) => (
                                        <SelectItem
                                            key={record.matrxRecordId}
                                            value={record.matrxRecordId}
                                        >
                                            {record.matrxRecordId}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
                {/* Child Records Column */}
                <ChildRecordsCard
                    childRecords={childRecords}
                    isLoading={isLoading}
                    loadingState={loadingState}
                />
                {/* Mapper State Column */}
                <Card className='bg-card'>
                    <CardHeader>
                        <CardTitle>Mapper State</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* <div className='max-h-[900px] overflow-y-auto'>
                            <pre className='bg-muted p-2 rounded-md text-xs'>{JSON.stringify(mapper.getState(), null, 2)}</pre>
                        </div> */}
                    </CardContent>
                </Card>
            </div>
            <MatrxDynamicPanel
                initialPosition='right'
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'Entity State',
                }}
            >
                <EnhancedEntityAnalyzer
                    defaultExpanded={false}
                    selectedEntityKey={currentDefinition.parent.name}
                />
            </MatrxDynamicPanel>
        </div>
    );
}
