'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CopyInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RELATIONSHIP_INPUTS } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import { useDoubleStableRelationships } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import DataItem from '@/components/ui/matrx/DataItem';
import { EntityDebugCard } from './EntityDebugComponents';

// Improved loading indicator with better visual feedback
const LoadingIndicator = ({ label, isLoading }) => (
    <div className={`p-4 rounded-lg min-w-[250px] ${
        isLoading 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
    }`}>
        <div className="flex items-center justify-between">
            <span className="font-medium">{label}</span>
            <span className="text-sm">{isLoading.toString()}</span>
        </div>
    </div>
);


export default function EnhancedJoinRecordsTest() {
    const [firstRelKey, setFirstRelkey] = useState('recipeMessage');
    const [secondRelKey, setSecondRelKey] = useState('aiAgent');
    const [pendingParentId, setPendingParentId] = useState('');
    const [activeParentId, setActiveParentId] = useState('');

    const { firstRelHook, secondRelHook } = useDoubleStableRelationships(firstRelKey, secondRelKey, activeParentId);

    // Destructure and rename for clarity
    const {
        joiningEntity: firstJoiningEntity,
        childEntity: firstChildEntity,
        joinIds: firstJoinIds,
        joinRecords: firstJoinRecords,
        joiningMatrxIds: firstJoiningMatrxIds,
        childIds: firstChildIds,
        childMatrxIds: firstChildMatrxIds,
        unprocessedChildRecords: firstChildRecords,
        childRecords: firstProcessedChildRecords,
        isLoading: firstIsLoading,
    } = firstRelHook;

    const {
        joiningEntity: secondJoiningEntity,
        childEntity: secondChildEntity,
        joinIds: secondJoinIds,
        joinRecords: secondJoinRecords,
        joiningMatrxIds: secondJoiningMatrxIds,
        childIds: secondChildIds,
        childMatrxIds: secondChildMatrxIds,
        unprocessedChildRecords: secondChildRecords,
        childRecords: secondProcessedChildRecords,
        isLoading: secondIsLoading,
    } = secondRelHook;

    // Combined loading state
    const isLoading = firstIsLoading || secondIsLoading;

    const handleLoadParent = () => {
        setActiveParentId(pendingParentId);
    };

    // Helper function to combine and process records
    const getCombinedRecords = () => {
        if (!firstProcessedChildRecords || !secondProcessedChildRecords) return null;

        return {
            firstRelationship: {
                records: firstProcessedChildRecords,
                entity: firstChildEntity,
            },
            secondRelationship: {
                records: secondProcessedChildRecords,
                entity: secondChildEntity,
            },
        };
    };

    const combinedRecords = getCombinedRecords();

    return (
        <div className='w-full p-2 space-y-4'>
            <Card>
                <CardHeader>
                    <CardTitle>Relationship Configuration</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div className='flex items-center space-x-4'>
                        <Select
                            value={firstRelKey}
                            onValueChange={setFirstRelkey}
                        >
                            <SelectTrigger className='w-48'>
                                <SelectValue placeholder='First relationship' />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(RELATIONSHIP_INPUTS).map((key) => (
                                    <SelectItem
                                        key={key}
                                        value={key}
                                    >
                                        {key}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={secondRelKey}
                            onValueChange={setSecondRelKey}
                        >
                            <SelectTrigger className='w-48'>
                                <SelectValue placeholder='Second relationship' />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(RELATIONSHIP_INPUTS).map((key) => (
                                    <SelectItem
                                        key={key}
                                        value={key}
                                    >
                                        {key}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <CopyInput
                            value={pendingParentId}
                            onChange={(e) => setPendingParentId(e.target.value)}
                            placeholder='Parent ID'
                            className='flex-1 min-w-[325px]'
                        />
                        <Button onClick={handleLoadParent}>{isLoading ? 'Loading...' : 'Load'}</Button>

                        <LoadingIndicator
                            label='First Relationship'
                            isLoading={firstIsLoading}
                        />
                        <LoadingIndicator
                            label='Second Relationship'
                            isLoading={secondIsLoading}
                        />
                    </div>

                    <DataItem
                        label='Active Parent ID'
                        value={activeParentId || 'None'}
                    />
                </CardContent>
            </Card>
            {combinedRecords && (
                <Card>
                    <CardHeader>
                        <CardTitle>Combined Records Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <h3 className='font-medium mb-2'>{firstRelKey}</h3>
                                <p>Records: {Object.keys(combinedRecords.firstRelationship.records).length}</p>
                                <p>Entity: {firstChildEntity}</p>
                            </div>
                            <div>
                                <h3 className='font-medium mb-2'>{secondRelKey}</h3>
                                <p>Records: {Object.keys(combinedRecords.secondRelationship.records).length}</p>
                                <p>Entity: {secondChildEntity}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            <div className='grid grid-cols-4 gap-4'>
                {/* First Relationship */}
                <EntityDebugCard
                    title='First Join'
                    entity={firstJoiningEntity}
                    ids={firstJoinIds}
                    matrxIds={firstJoiningMatrxIds}
                    records={firstJoinRecords}
                />
                <EntityDebugCard
                    title='First Processed'
                    entity={firstChildEntity}
                    ids={firstChildIds}
                    matrxIds={firstChildMatrxIds}
                    records={firstProcessedChildRecords}
                />

                {/* Second Relationship */}
                <EntityDebugCard
                    title='Second Join'
                    entity={secondJoiningEntity}
                    ids={secondJoinIds}
                    matrxIds={secondJoiningMatrxIds}
                    records={secondJoinRecords}
                />
                <EntityDebugCard
                    title='Second Processed'
                    entity={secondChildEntity}
                    ids={secondChildIds}
                    matrxIds={secondChildMatrxIds}
                    records={secondProcessedChildRecords}
                />
            </div>
        </div>
    );
}
