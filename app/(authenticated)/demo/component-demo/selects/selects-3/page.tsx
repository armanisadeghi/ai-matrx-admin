// '@/app/demo/select/page.tsx'
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {Select} from '@/components/ui/loaders/select';
import TextDivider from '@/components/matrx/TextDivider';
import {
    Select as ControlSelect,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select';
import { ComponentSize } from '@/types/componentConfigTypes';
import { ButtonVariant } from '@/components/matrx/ArmaniForm/field-components/types';

export default function DemoPage() {
    const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
    ];

    const [basicValue, setBasicValue] = useState('option1');
    const [advancedValue, setAdvancedValue] = useState('option1');
    const [size, setSize] = useState('default');
    const [variant, setVariant] = useState('default');
    const [isLoading, setIsLoading] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [error, setError] = useState(false);

    const handleBasicChange = (value: string) => {
        setBasicValue(value);
    };

    const handleAdvancedChange = (value: string) => {
        setAdvancedValue(value);
    };

    return (
        <div className="container mx-auto p-4">
            <h3 className="text-sm mb-6">Demo of the Select Component</h3>

            <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="basic">Basic Example</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Example</TabsTrigger>
                    <TabsTrigger value="all">All Variations</TabsTrigger>
                </TabsList>

                {/* Basic Example Tab */}
                <TabsContent value="basic">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Select</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select
                                options={options}
                                value={basicValue}
                                onChange={handleBasicChange}
                                placeholder="Select an option"
                            />
                        </CardContent>
                    </Card>
                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ basicValue }, null, 2)}</pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Advanced Example Tab */}
                <TabsContent value="advanced">
                    <div className="grid grid-cols-4 gap-4">
                        {/* Controls Card */}
                        <div className="col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Controls</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Size</label>
                                            <ControlSelect value={size} onValueChange={setSize}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="xs">Extra Small</SelectItem>
                                                    <SelectItem value="sm">Small</SelectItem>
                                                    <SelectItem value="default">Default</SelectItem>
                                                    <SelectItem value="md">Medium</SelectItem>
                                                    <SelectItem value="lg">Large</SelectItem>
                                                    <SelectItem value="xl">Extra Large</SelectItem>
                                                    <SelectItem value="2xl">2XL</SelectItem>
                                                    <SelectItem value="3xl">3XL</SelectItem>
                                                    <SelectItem value="icon">Icon</SelectItem>
                                                    <SelectItem value="roundIcon">Round Icon</SelectItem>
                                                </SelectContent>
                                            </ControlSelect>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Variant</label>
                                            <ControlSelect value={variant} onValueChange={setVariant}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="default">Default</SelectItem>
                                                    <SelectItem value="destructive">Destructive</SelectItem>
                                                    <SelectItem value="success">Success</SelectItem>
                                                    <SelectItem value="outline">Outline</SelectItem>
                                                    <SelectItem value="secondary">Secondary</SelectItem>
                                                    <SelectItem value="ghost">Ghost</SelectItem>
                                                    <SelectItem value="link">Link</SelectItem>
                                                    <SelectItem value="primary">Primary</SelectItem>
                                                </SelectContent>
                                            </ControlSelect>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Loading</label>
                                            <input
                                                type="checkbox"
                                                checked={isLoading}
                                                onChange={(e) => setIsLoading(e.target.checked)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Disabled</label>
                                            <input
                                                type="checkbox"
                                                checked={disabled}
                                                onChange={(e) => setDisabled(e.target.checked)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Error</label>
                                            <input
                                                type="checkbox"
                                                checked={error}
                                                onChange={(e) => setError(e.target.checked)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Component Card */}
                        <div className="col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Advanced Select</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Select
                                        options={options}
                                        value={advancedValue}
                                        onChange={handleAdvancedChange}
                                        placeholder="Select an option"
                                        size={size as ComponentSize}
                                        variant={variant as ButtonVariant}
                                        isLoading={isLoading}
                                        disabled={disabled}
                                        error={error}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ advancedValue, size, variant, isLoading, disabled, error }, null, 2)}</pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* All Variations Tab */}
                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Variations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TextDivider text="Default Size" />
                            <Select
                                options={options}
                                value={basicValue}
                                onChange={handleBasicChange}
                                placeholder="Select an option"
                            />

                            <TextDivider text="Large Size" />
                            <Select
                                options={options}
                                value={basicValue}
                                onChange={handleBasicChange}
                                placeholder="Select an option"
                                size="lg"
                            />

                            <TextDivider text="Destructive Variant" />
                            <Select
                                options={options}
                                value={basicValue}
                                onChange={handleBasicChange}
                                placeholder="Select an option"
                                variant="destructive"
                            />

                            <TextDivider text="Loading State" />
                            <Select
                                options={options}
                                value={basicValue}
                                onChange={handleBasicChange}
                                placeholder="Select an option"
                                isLoading={true}
                            />

                            <TextDivider text="Disabled State" />
                            <Select
                                options={options}
                                value={basicValue}
                                onChange={handleBasicChange}
                                placeholder="Select an option"
                                disabled={true}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
