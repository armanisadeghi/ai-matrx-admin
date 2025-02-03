'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EntityKeys } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EntityJsonBuilderWithSelect from '../EntityJsonBuilderWithSelect';
import { useSequentialCreate } from '@/app/entities/hooks/crud/useSequentialCreate';

const SequentialTestPage = () => {
    const [firstJsonValue, setFirstJsonValue] = useState('');
    const [secondJsonValue, setSecondJsonValue] = useState('');
    const [firstEntity, setFirstEntity] = useState<EntityKeys>('dataBroker');
    const [secondEntity, setSecondEntity] = useState<EntityKeys>('messageBroker');
    const [results, setResults] = useState<{ first: any; second: any } | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [executionTimes, setExecutionTimes] = useState<{ first: number | null; second: number | null }>({
        first: null,
        second: null,
    });
    const [isLoading, setIsLoading] = useState(false);

    const sequentialCreate = useSequentialCreate({
        firstEntity,
        secondEntity,
        onFirstSuccess: (result) => {
            console.log('First operation succeeded:', result);
        },
        onSecondSuccess: (result) => {
            console.log('Second operation succeeded:', result);
        },
        onError: (error) => {
            console.error('Operation failed:', error);
        },
    });

    const handleFirstJsonChange = (value: string) => {
        setFirstJsonValue(value);
        resetStates();
    };

    const handleSecondJsonChange = (value: string) => {
        setSecondJsonValue(value);
        resetStates();
    };

    const handleFirstEntityChange = (entity: EntityKeys) => {
        setFirstEntity(entity);
        resetStates();
    };

    const handleSecondEntityChange = (entity: EntityKeys) => {
        setSecondEntity(entity);
        resetStates();
    };

    const resetStates = () => {
        setResults(null);
        setError(null);
        setExecutionTimes({ first: null, second: null });
    };

    const handleSequentialCreate = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setResults(null);
            setExecutionTimes({ first: null, second: null });

            const firstParsedData = JSON.parse(firstJsonValue);
            const secondParsedData = JSON.parse(secondJsonValue);

            const { matrxRecordId: firstMatrxRecordId, ...firstCleanData } = firstParsedData;
            const { matrxRecordId: secondMatrxRecordId, ...secondCleanData } = secondParsedData;

            const startTime = performance.now();

            const response = await sequentialCreate({
                firstData: firstCleanData,
                secondData: secondCleanData,
                firstMatrxRecordId,
                secondMatrxRecordId,
            });

            const endTime = performance.now();

            setResults({
                first: response.firstResult,
                second: response.secondResult,
            });

            setExecutionTimes({
                first: endTime - startTime,
                second: endTime - startTime,
            });
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='container mx-auto p-6'>
            <Card>
                <CardHeader>
                    <CardTitle>Sequential Operations Test</CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                    <div className='grid grid-cols-2 gap-6'>
                        <Card>
                            <CardHeader>
                                <CardTitle>First Operation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <EntityJsonBuilderWithSelect
                                    defaultEntity={firstEntity}
                                    label='First Entity Configuration'
                                    value={firstJsonValue}
                                    onChange={handleFirstJsonChange}
                                    onEntityChange={handleFirstEntityChange}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Second Operation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <EntityJsonBuilderWithSelect
                                    defaultEntity={secondEntity}
                                    label='Second Entity Configuration'
                                    value={secondJsonValue}
                                    onChange={handleSecondJsonChange}
                                    onEntityChange={handleSecondEntityChange}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {firstJsonValue && secondJsonValue && (
                        <Button
                            onClick={handleSequentialCreate}
                            className='w-full'
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing Sequential Operations...' : 'Create Both Records'}
                        </Button>
                    )}

                    {error && (
                        <Alert variant='destructive'>
                            <AlertDescription>{error.message}</AlertDescription>
                        </Alert>
                    )}

                    {results && (
                        <div className='space-y-4'>
                            <Alert>
                                <AlertDescription>Sequential operations completed in {executionTimes.second?.toFixed(2)}ms</AlertDescription>
                            </Alert>

                            <div className='grid grid-cols-2 gap-6'>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>First Operation Result</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <pre className='bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-auto max-h-96'>
                                            {JSON.stringify(results.first, null, 2)}
                                        </pre>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Second Operation Result</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <pre className='bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-auto max-h-96'>
                                            {JSON.stringify(results.second, null, 2)}
                                        </pre>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SequentialTestPage;
