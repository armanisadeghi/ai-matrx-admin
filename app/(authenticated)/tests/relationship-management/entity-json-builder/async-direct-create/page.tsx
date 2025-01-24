'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EntityKeys } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateWithId } from '@/app/entities/hooks/crud/useDirectCreateRecord';
import EntityJsonBuilderWithSelect from '../EntityJsonBuilderWithSelect';

const AsyncTestPage = () => {
    const [jsonValue, setJsonValue] = useState('');
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys>('dataBroker');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<Error | null>(null);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const createWithId = useCreateWithId({
        entityKey: selectedEntity,
        onSuccess: (result) => {
            console.log('Success:', result);
        },
        onError: (error) => {
            console.error('Error:', error);
        },
    });

    const handleJsonChange = (value: string) => {
        setJsonValue(value);
        setResult(null);
        setError(null);
        setExecutionTime(null);
    };

    const handleEntityChange = (entity: EntityKeys) => {
        setSelectedEntity(entity);
        setResult(null);
        setError(null);
        setExecutionTime(null);
    };

    const handleCreateRecord = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setResult(null);

            const parsedData = JSON.parse(jsonValue);
            const startTime = performance.now();
            const { matrxRecordId, ...cleanData } = parsedData;

            const response = await createWithId({
                data: cleanData,
                matrxRecordId,
            });

            const endTime = performance.now();
            setExecutionTime(endTime - startTime);
            setResult(response.result);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className='p-8 max-w-3xl mx-auto space-y-6'>
            <Card>
                <CardHeader>
                    <CardTitle>Async Operation Test</CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                    <EntityJsonBuilderWithSelect
                        defaultEntity={selectedEntity}
                        label='Entity Configuration'
                        value={jsonValue}
                        onChange={handleJsonChange}
                        onEntityChange={handleEntityChange}
                    />

                    {jsonValue && (
                        <Button
                            onClick={handleCreateRecord}
                            className='w-full'
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : 'Create Record'}
                        </Button>
                    )}

                    {error && (
                        <Alert variant='destructive'>
                            <AlertDescription>{error.message}</AlertDescription>
                        </Alert>
                    )}

                    {result && (
                        <div className='space-y-4'>
                            <Alert>
                                <AlertDescription>Operation completed in {executionTime?.toFixed(2)}ms</AlertDescription>
                            </Alert>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Result</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <pre className='bg-slate-100  dark:bg-slate-800 p-4 rounded-lg overflow-auto max-h-96'>{JSON.stringify(result, null, 2)}</pre>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AsyncTestPage;
