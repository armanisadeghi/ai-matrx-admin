'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRelWithFetch } from '@/app/entities/hooks/relationships/useRelationshipMapper';
import MatrxDynamicPanel from '@/components/matrx/resizable/MatrxDynamicPanel';
import EnhancedEntityAnalyzer from '@/components/admin/redux/EnhancedEntityAnalyzer';
import ChildRecordsCard from './ChildRecordCard';
import QuickRefSelect from '@/app/entities/quick-reference/QuickRefSelectFloatingLabel';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import JsonBuilder from './JsonBuilder'; // Import the new component
import { createRelationshipDefinition } from '@/app/entities/hooks/relationships/definitionConversionUtil';

export const recipeMessageDef = createRelationshipDefinition(
    'recipeMessage',
    'recipe', 
    'messageTemplate',
    'order'
);


export default function RelationshipTester() {
    // UI States
    const [inputParentId, setInputParentId] = useState('');
    const [activeParentId, setActiveParentId] = useState('');
    const [selectedChildId, setSelectedChildId] = useState<string>('');
    const [childDataInput, setChildDataInput] = useState('');
    const [joinDataInput, setJoinDataInput] = useState('');

    const { mapper, childRecords, parentMatrxid, deleteChildAndJoin, createRelatedRecords, isLoading, loadingState } = useRelWithFetch(
        recipeMessageDef,
        activeParentId
    );

    const handleLoadData = () => {
        setActiveParentId(inputParentId);
    };

    const handleCreate = async () => {
        try {
            const childData = childDataInput ? JSON.parse(childDataInput) : {};
            const joinData = joinDataInput ? JSON.parse(joinDataInput) : {};

            await createRelatedRecords(
                {
                    child: childData,
                    joining: joinData,
                },
                {
                    onSuccess: () => {
                        setChildDataInput('');
                        setJoinDataInput('');
                    },
                    onError: (error) => {
                        console.error('Failed to create relationship:', error);
                    },
                }
            );
        } catch (error) {
            console.error('Failed to parse JSON data:', error);
        }
    };

    const handleRecipeChange = (record: QuickReferenceRecord) => {
        setInputParentId(record.primaryKeyValues.id);
        setActiveParentId(record.primaryKeyValues.id);
    };

    return (
        <div className='p-4 w-full space-y-4'>
            {/* Top Entry Section */}
            <Card className='bg-card'>
                <CardHeader>
                    <CardTitle>Relationship Testing Interface</CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-2 gap-4'>
                    <div className='col-span-2 space-y-2'>
                        <label className='text-sm font-medium'>Parent ID</label>
                        <div className='flex gap-2'>
                            <QuickRefSelect
                                entityKey='recipe'
                                onRecordChange={handleRecipeChange}
                            />
                            <Input
                                value={inputParentId}
                                onChange={(e) => setInputParentId(e.target.value)}
                                placeholder='Enter parent ID'
                                className='flex-1'
                            />
                            <Button
                                onClick={handleLoadData}
                                disabled={!inputParentId}
                            >
                                Load Data
                            </Button>
                        </div>
                    </div>

                    <JsonBuilder
                        label='Child Data (messageTemplate)'
                        value={childDataInput}
                        onChange={setChildDataInput}
                    />

                    <JsonBuilder
                        label='Join Data (recipeMessage)'
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
                        <div className='max-h-[900px] overflow-y-auto'>
                            <pre className='bg-muted p-2 rounded-md text-xs'>{JSON.stringify(mapper.getState(), null, 2)}</pre>
                        </div>
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
                    selectedEntityKey='recipe'
                />
            </MatrxDynamicPanel>
        </div>
    );
}
