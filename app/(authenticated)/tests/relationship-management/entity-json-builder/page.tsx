'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EntityJsonBuilderWithSelect from './EntityJsonBuilderWithSelect';
import { EntityKeys } from '@/types';

const TestPage = () => {
    const [jsonValue, setJsonValue] = useState('');
    const handleJsonChange = (value: string) => {
        setJsonValue(value);
        console.log('Current JSON:', value);
    };

    const handleEntityChange = (entity: EntityKeys) => {
        console.log('Selected Entity:', entity);
    };

    const handleProcessJson = () => {
        try {
            const parsedJson = JSON.parse(jsonValue);
            console.log('Processed JSON:', parsedJson);
        } catch (error) {
            console.error('Error processing JSON:', error);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <EntityJsonBuilderWithSelect
                        defaultEntity="dataBroker"
                        label="Entity Configuration"
                        value={jsonValue}
                        onChange={handleJsonChange}
                        onEntityChange={handleEntityChange}
                    />
                    
                    {jsonValue && (
                            <Button 
                                onClick={handleProcessJson}
                                className="w-full"
                            >
                                Process JSON Data
                            </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TestPage;