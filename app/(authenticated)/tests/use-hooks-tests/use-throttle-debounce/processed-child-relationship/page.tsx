'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CopyInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getStandardRelationship, RELATIONSHIP_INPUTS } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import { useRelFetchProcessing } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import DataItem from '@/components/ui/matrx/DataItem';
import DataChangeCounterEnhanced from '@/components/ui/matrx/DataChangeCounterEnhanced';
import { useStableRelationships } from '@/app/entities/hooks/relationships/new/useStableRelationships';

const LoadingIndicator = ({ label, isLoading }) => (
    <div className={`p-4 rounded-lg ${isLoading ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        <div className='flex items-center justify-between'>
            <span className='font-medium'>{label}</span>
            <span className='text-sm'>{isLoading.toString()}</span>
        </div>
    </div>
);

export default function EnhancedJoinRecordsTest() {
    const [relKey, setRelKey] = useState('recipeMessage');
    const [pendingParentId, setPendingParentId] = useState('');
    const [activeParentId, setActiveParentId] = useState('');

    const relDefSimple = getStandardRelationship(relKey);
    const {
        // Entity names
        parentEntity,
        joiningEntity,
        childEntity,

        // Parent data
        parentId,
        parentRecords,
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
    } = useRelFetchProcessing(relDefSimple, activeParentId);


    const handleLoadParent = () => {
        setActiveParentId(pendingParentId);
    };

    return (
        <div className='w-full p-2 space-y-4'>
            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div className='flex items-center space-x-4'>
                        <Select
                            value={relKey}
                            onValueChange={setRelKey}
                        >
                            <SelectTrigger className='w-[200px]'>
                                <SelectValue placeholder='Select relationship' />
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
                        <Button
                            onClick={handleLoadParent}
                            disabled={!pendingParentId}
                        >
                            Load
                        </Button>
                    </div>
                    <DataItem
                        label='Active Parent ID'
                        value={activeParentId || 'None'}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Loading States</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='grid grid-cols-6 gap-4'>
                        <LoadingIndicator
                            label='Overall Loading'
                            isLoading={isLoading}
                        />
                        <DataChangeCounterEnhanced
                            label='Join ID Changes'
                            data={joiningMatrxIds}
                        />
                        <DataChangeCounterEnhanced
                            label='Join Record Changes'
                            data={joinRecords}
                        />
                        <DataChangeCounterEnhanced
                            label='Child ID Changes'
                            data={childMatrxIds}
                        />
                        <DataChangeCounterEnhanced
                            label='Child Record Changes'
                            data={childRecords}
                        />
                        <DataChangeCounterEnhanced
                            label='Processed Child Record Changes'
                            data={childRecords}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className='grid grid-cols-4 gap-2'>
                {/* Parent Entity - Each piece of data shown independently */}
                <Card>
                    <CardHeader>
                        <CardTitle>Parent Entity: {parentEntity}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                        <DataItem
                            label='parentId'
                            value={parentId}
                        />
                        <DataItem
                            label='parentMatrxid'
                            value={parentMatrxid}
                        />
                        <DataItem
                            label='parentRecords'
                            value={parentRecords}
                        />
                    </CardContent>
                </Card>

                {/* Joining Entity - Each piece of data shown independently */}
                <Card>
                    <CardHeader>
                        <CardTitle>Joining Entity: {joiningEntity} </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                        <DataItem
                            label='joinIds'
                            value={joinIds}
                        />
                        <DataItem
                            label='joiningMatrxIds'
                            value={joiningMatrxIds}
                        />
                        <DataItem
                            label='joinRecords'
                            value={joinRecords}
                        />
                    </CardContent>
                </Card>

                {/* Child Entity - Each piece of data shown independently */}
                <Card>
                    <CardHeader>
                        <CardTitle>Child Entity: {childEntity}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                        <DataItem
                            label='childIds'
                            value={childIds}
                        />
                        <DataItem
                            label='childMatrxIds'
                            value={childMatrxIds}
                        />
                        <DataItem
                            label='childRecords'
                            value={unprocessedChildRecords}
                        />
                    </CardContent>
                </Card>
                {/* Processed Child Entity - Each piece of data shown independently */}
                <Card>
                    <CardHeader>
                        <CardTitle>Processed Records: {childEntity}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                        <DataChangeCounterEnhanced
                            label='Processed Child Record Changes'
                            data={childRecords}
                        />
                        <DataItem
                            label='Processed Child Records'
                            value={childRecords}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
