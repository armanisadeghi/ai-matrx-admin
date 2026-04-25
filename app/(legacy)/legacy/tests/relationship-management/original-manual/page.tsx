'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ENRICHED_RELATIONSHIP_DEFINITIONS, RelatedDataManager } from '@/app/entities/hooks/relationships/relationshipDefinitions';
import { Separator } from '@/components/ui/separator';

type EntityData = Record<string, unknown>;

interface EntityInputProps {
    label: string;
    data: EntityData;
    onDataChange: (data: EntityData) => void;
    fields?: string[];
}

const EntityDataInput: React.FC<EntityInputProps> = ({ label, data, onDataChange, fields = [] }) => {
    const [localData, setLocalData] = useState<EntityData>(data);
    const [newFieldKey, setNewFieldKey] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');

    const handleSave = () => {
        const updatedData = { ...localData };
        if (newFieldKey && newFieldValue) {
            updatedData[newFieldKey] = newFieldValue;
        }
        onDataChange(updatedData);
        setNewFieldKey('');
        setNewFieldValue('');
    };

    const handleFieldChange = (key: string, value: string) => {
        setLocalData((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className='space-y-4'>
            <div className='text-sm font-medium mb-2'>{label}</div>
            {fields.map((field) => (
                <div
                    key={field}
                    className='flex gap-4'
                >
                    <Input
                        value={field}
                        disabled
                        className='bg-muted flex-1'
                    />
                    <Input
                        value={localData[field]?.toString() || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        placeholder='Value'
                        className='flex-1'
                    />
                </div>
            ))}
            <div className='flex gap-4'>
                <Input
                    placeholder='New Field'
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    className='flex-1'
                />
                <Input
                    placeholder='Value'
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className='flex-1'
                />
            </div>
            <Button
                onClick={handleSave}
                className='w-full'
            >
                Apply Changes
            </Button>
        </div>
    );
};

const RelationshipTester = () => {
    const [selectedRelationship, setSelectedRelationship] = useState<string>('');
    const [manager, setManager] = useState<RelatedDataManager | null>(null);
    const [parentId, setParentId] = useState<string>('');
    const [childData, setChildData] = useState<Record<string, unknown>>({});
    const [childTwoData, setChildTwoData] = useState<Record<string, unknown>>({});
    const [childThreeData, setChildThreeData] = useState<Record<string, unknown>>({});
    const [joiningData, setJoiningData] = useState<Record<string, unknown>>({});
    const [result, setResult] = useState<{
        childEntity?: Record<string, unknown>;
        childTwoEntity?: Record<string, unknown>;
        childThreeEntity?: Record<string, unknown>;
        joiningEntity?: Record<string, unknown>;
    }>({});

    const handleRelationshipSelect = useCallback((value: string) => {
        setSelectedRelationship(value);
        const newManager = new RelatedDataManager(value as any, {
            joiningEntity: true,
            child: true,
            childTwo: true,
            childThree: true,
        });
        setManager(newManager);
        resetAllData();
    }, []);

    const resetAllData = () => {
        setParentId('');
        setChildData({});
        setChildTwoData({});
        setChildThreeData({});
        setJoiningData({});
        setResult({});
    };

    const handleCreateRelationship = useCallback(() => {
        if (!manager || !parentId) return;

        const relationship = manager.createEntityWithRelationship(parentId, childData, joiningData);

        const fullResult = {
            ...relationship,
            childTwoEntity: manager.childTwoEntity ? childTwoData : undefined,
            childThreeEntity: manager.childThreeEntity ? childThreeData : undefined,
        };

        setResult(fullResult);
    }, [manager, parentId, childData, childTwoData, childThreeData, joiningData]);

    const renderEntitySection = (entityName: string, data: EntityData, setData: (data: EntityData) => void, fields: string[] = []) => (
        <Card className='mb-8'>
            <CardHeader>
                <CardTitle>{entityName}</CardTitle>
            </CardHeader>
            <CardContent>
                <EntityDataInput
                    label={entityName}
                    data={data}
                    onDataChange={setData}
                    fields={fields}
                />
            </CardContent>
        </Card>
    );

    const renderRelationshipInfo = () => {
        if (!manager) return null;

        return (
            <div className='grid grid-cols-2 gap-8'>
                <Card>
                    <CardHeader>
                        <CardTitle>Entity Structure</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='space-y-4 text-lg'>
                            <div>Parent: {manager.parentEntity}</div>
                            <div>Child: {manager.childEntity}</div>
                            {manager.childTwoEntity && <div>Child Two: {manager.childTwoEntity}</div>}
                            {manager.childThreeEntity && <div>Child Three: {manager.childThreeEntity}</div>}
                            <Separator className='my-6' />
                            <div>Joining Table: {manager.joiningTable}</div>
                            <div>Additional Fields: {manager.additionalFields.join(', ')}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Current Values</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea>
                            <pre className='text-sm'>{JSON.stringify(manager.getCurrentValues(), null, 2)}</pre>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className='flex flex-col gap-8'>
            <Card>
                <CardHeader>
                    <CardTitle>Relationship Manager Tester</CardTitle>
                    <CardDescription>Test relationships with multiple entities</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedRelationship}
                        onValueChange={handleRelationshipSelect}
                    >
                        <SelectTrigger className='w-96'>
                            <SelectValue placeholder='Select Relationship' />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(ENRICHED_RELATIONSHIP_DEFINITIONS).map((key) => (
                                <SelectItem
                                    key={key}
                                    value={key}
                                >
                                    {key}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {manager && (
                <Card>
                    <CardContent className='p-6'>
                        <Tabs
                            defaultValue='input'
                            className='w-full'
                        >
                            <TabsList>
                                <TabsTrigger value='input'>Input Data</TabsTrigger>
                                <TabsTrigger value='result'>Result</TabsTrigger>
                                <TabsTrigger value='info'>Relationship Info</TabsTrigger>
                            </TabsList>

                            <div className='mt-6'>
                                <TabsContent value='input'>
                                    <div className='grid grid-cols-2 gap-8'>
                                        <div className='space-y-8'>
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Parent ID</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className='flex gap-4'>
                                                        <Input
                                                            value={parentId}
                                                            onChange={(e) => setParentId(e.target.value)}
                                                            placeholder='Parent ID'
                                                            className='text-lg flex-1'
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {renderEntitySection('Child Entity', childData, setChildData)}
                                            {manager.childTwoEntity && renderEntitySection('Child Two Entity', childTwoData, setChildTwoData)}
                                            {manager.childThreeEntity && renderEntitySection('Child Three Entity', childThreeData, setChildThreeData)}
                                            {renderEntitySection('Joining Data', joiningData, setJoiningData, manager.additionalFields)}

                                            <div className='flex gap-4'>
                                                <Button
                                                    size='lg'
                                                    onClick={handleCreateRelationship}
                                                >
                                                    Create Relationship
                                                </Button>
                                                <Button
                                                    variant='outline'
                                                    size='lg'
                                                    onClick={() => {
                                                        manager.reset();
                                                        resetAllData();
                                                    }}
                                                >
                                                    Reset All
                                                </Button>
                                            </div>
                                        </div>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Preview</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ScrollArea>
                                                    <pre className='text-sm'>
                                                        {JSON.stringify(
                                                            {
                                                                parentId,
                                                                childData,
                                                                childTwoData: manager.childTwoEntity ? childTwoData : undefined,
                                                                childThreeData: manager.childThreeEntity ? childThreeData : undefined,
                                                                joiningData,
                                                            },
                                                            null,
                                                            2
                                                        )}
                                                    </pre>
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>

                                <TabsContent value='result'>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Result Data</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea>
                                                <pre className='text-sm'>{JSON.stringify(result, null, 2)}</pre>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value='info'>{renderRelationshipInfo()}</TabsContent>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default RelationshipTester;
