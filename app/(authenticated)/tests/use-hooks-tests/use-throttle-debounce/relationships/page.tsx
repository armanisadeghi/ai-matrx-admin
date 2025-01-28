'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getStandardRelationship, RELATIONSHIP_INPUTS } from '@/app/entities/hooks/relationships/definitionConversionUtil';
import { useStableJoinRecords } from '@/app/entities/hooks/relationships/dev/useStableJoinRecords';

const DataItem = ({ label, value }) => (
    <div className="p-2 bg-background rounded-lg">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <pre className="mt-1 text-sm whitespace-pre-wrap break-all">
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
        </pre>
    </div>
);

const LoadingIndicator = ({ label, isLoading }) => (
    <div className={`p-4 rounded-lg ${
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
    const [relKey, setRelKey] = useState('recipeMessage');
    const [pendingParentId, setPendingParentId] = useState('');
    const [activeParentId, setActiveParentId] = useState('');

    const relDefSimple = getStandardRelationship(relKey);
    const {
        // Parent entity data
        parentId: resolvedParentId,
        parentMatrxid,
        parentEntity,
        parentRecords,

        // Joining entity data
        joiningEntity,
        joinRecords,
        joiningMatrxIds,

        // Child entity data
        childEntity,
        childIds,
        childMatrxIds,
        
        // Loading states
        isLoading,
    } = useStableJoinRecords(relDefSimple, activeParentId);

    const handleLoadParent = () => {
        setActiveParentId(pendingParentId);
    };


    useEffect(() => {
        console.log('Component Loading Check:', isLoading);
    }, [isLoading]);


    return (
        <div className="w-full p-4 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <Select
                            value={relKey}
                            onValueChange={setRelKey}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(RELATIONSHIP_INPUTS).map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {key}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            value={pendingParentId}
                            onChange={(e) => setPendingParentId(e.target.value)}
                            placeholder="Parent ID"
                            className="flex-1"
                        />
                        <Button 
                            onClick={handleLoadParent}
                            disabled={!pendingParentId}
                        >
                            Load
                        </Button>
                    </div>
                    <DataItem label="Active Parent ID" value={activeParentId || 'None'} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Loading States</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                        <LoadingIndicator 
                            label="Stable Join Loading" 
                            isLoading={isLoading} 
                        />
                        {/* <LoadingIndicator 
                            label="Parent Loading" 
                            isLoading={isParentLoading} 
                        />
                        <LoadingIndicator 
                            label="Join Loading" 
                            isLoading={isJoinLoading} 
                        />
                        <LoadingIndicator 
                            label="Is Changing" 
                            isLoading={isChanging} 
                        /> */}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4">
                {/* Parent Entity - Each piece of data shown independently */}
                <Card>
                    <CardHeader>
                        <CardTitle>Parent Entity: {parentEntity}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <DataItem label="parentId" value={resolvedParentId} />
                        <DataItem label="parentMatrxid" value={parentMatrxid} />
                        <DataItem label="parentRecords" value={parentRecords} />
                    </CardContent>
                </Card>

                {/* Joining Entity - Each piece of data shown independently */}
                <Card>
                    <CardHeader>
                        <CardTitle>Joining Entity: {joiningEntity} </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <DataItem label="joiningMatrxIds" value={joiningMatrxIds} />
                        <DataItem label="joinRecords" value={joinRecords} />
                    </CardContent>
                </Card>

                {/* Child Entity - Each piece of data shown independently */}
                <Card>
                    <CardHeader>
                        <CardTitle>Child Entity: {childEntity}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <DataItem label="childIds" value={childIds} />
                        <DataItem label="childMatrxIds" value={childMatrxIds} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}