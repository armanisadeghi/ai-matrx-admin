'use client';

import React, { memo, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EntityDataWithKey, EntityKeys, ProcessedEntityData } from '@/types';

type LoadingState = {
    isLoading: boolean;
    isJoinLoading: boolean;
    isDeleting: boolean;
    isChildLoading: boolean;
}

export const ChildRecordsCard = memo(
    ({
        childRecords,
        isLoading,
        loadingState,
    }: {
        childRecords: ProcessedEntityData<EntityKeys>[];
        isLoading: boolean;
        loadingState: LoadingState;
    }) => {
        const [showContent, setShowContent] = useState(false);

        useEffect(() => {
            const timer = setTimeout(() => {
                setShowContent(true);
            }, 500);

            return () => clearTimeout(timer);
        }, [childRecords, isLoading]);

        if (!showContent || isLoading) {
            return (
                <Card className='bg-card'>
                    <CardHeader>
                        <CardTitle>Child Records (Loading...)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='space-y-2'>
                            <Alert>
                                <AlertDescription className='space-y-1'>
                                    {loadingState.isLoading && <div>Loading parent record...</div>}
                                    {loadingState.isJoinLoading && <div>Loading join records...</div>}
                                    {loadingState.isChildLoading && <div>Loading child records...</div>}
                                </AlertDescription>
                            </Alert>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card className='bg-card'>
                <CardHeader>
                    <CardTitle>Child Records ({childRecords.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='max-h-[900px] overflow-y-auto space-y-2'>
                        {childRecords.map((record) => (
                            <div key={record.matrxRecordId}>
                                <label className='text-sm font-medium block'>ID: {record.matrxRecordId}</label>
                                <pre className='mt-1 bg-muted p-2 rounded-md text-xs'>{JSON.stringify(record, null, 2)}</pre>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }
);

export default ChildRecordsCard;
