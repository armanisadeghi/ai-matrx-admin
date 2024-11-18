/*
// '@/app/demo/component-demo/radio-checkbox/page.tsx'
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select';
import TextDivider from '@/components/matrx/TextDivider';
import { MatrxRadioGroup } from '@/components/ui/samples';
import MatrxCheckbox from '@/components/matrx/MatrxCheckbox';

export default function DemoPage() {
    const [radioValue, setRadioValue] = useState('option1');
    const [checkboxValue, setCheckboxValue] = useState(false);
    const [advancedRadioProps, setAdvancedRadioProps] = useState({
        layout: 'vertical',
        columns: 1,
        density: 'normal',
        size: 'md',
        variant: 'default',
        error: '',
        hint: '',
    });

    const [advancedCheckboxProps, setAdvancedCheckboxProps] = useState({
        density: 'normal',
        size: 'md',
        variant: 'default',
        error: '',
        hint: '',
        animation: 'subtle',
    });

    const handleAdvancedRadioChange = (key: string, value: any) => {
        setAdvancedRadioProps((prevState) => ({
            ...prevState,
            [key]: value,
        }));
    };

    const handleAdvancedCheckboxChange = (key: string, value: any) => {
        setAdvancedCheckboxProps((prevState) => ({
            ...prevState,
            [key]: value,
        }));
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Demo of MatrxRadioGroup and MatrxCheckbox Components</h1>

            <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="basic">Basic Example</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Example</TabsTrigger>
                    <TabsTrigger value="all">All Variations</TabsTrigger>
                </TabsList>

                {/!* Basic Example Tab *!/}
                <TabsContent value="basic">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Radio Group</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MatrxRadioGroup
                                label="Choose an Option"
                                layout="vertical"
                                size="md"
                                density="normal"
                            >
                                <MatrxCheckbox
                                    field={{ name: 'option1', label: 'Option 1' }}
                                    checked={radioValue === 'option1'}
                                    onChange={() => setRadioValue('option1')}
                                />
                                <MatrxCheckbox
                                    field={{ name: 'option2', label: 'Option 2' }}
                                    checked={radioValue === 'option2'}
                                    onChange={() => setRadioValue('option2')}
                                />
                            </MatrxRadioGroup>
                        </CardContent>
                    </Card>

                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Basic Checkbox</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MatrxCheckbox
                                field={{ name: 'checkbox', label: 'Accept Terms' }}
                                checked={checkboxValue}
                                onChange={setCheckboxValue}
                            />
                        </CardContent>
                    </Card>

                    {/!* State Display Card *!/}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ radioValue, checkboxValue }, null, 2)}</pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/!* Advanced Example Tab *!/}
                <TabsContent value="advanced">
                    <div className="grid grid-cols-4 gap-4">
                        {/!* Controls Card *!/}
                        <div className="col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Radio Group Controls</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Layout</label>
                                            <Select
                                                value={advancedRadioProps.layout}
                                                onValueChange={(value) => handleAdvancedRadioChange('layout', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="vertical">Vertical</SelectItem>
                                                    <SelectItem value="horizontal">Horizontal</SelectItem>
                                                    <SelectItem value="grid">Grid</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Columns</label>
                                            <input
                                                type="number"
                                                value={advancedRadioProps.columns}
                                                onChange={(e) => handleAdvancedRadioChange('columns', Number(e.target.value))}
                                                className="border border-gray-300 rounded-md p-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Density</label>
                                            <Select
                                                value={advancedRadioProps.density}
                                                onValueChange={(value) => handleAdvancedRadioChange('density', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="compact">Compact</SelectItem>
                                                    <SelectItem value="normal">Normal</SelectItem>
                                                    <SelectItem value="comfortable">Comfortable</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Size</label>
                                            <Select
                                                value={advancedRadioProps.size}
                                                onValueChange={(value) => handleAdvancedRadioChange('size', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="xs">Extra Small</SelectItem>
                                                    <SelectItem value="sm">Small</SelectItem>
                                                    <SelectItem value="md">Medium</SelectItem>
                                                    <SelectItem value="lg">Large</SelectItem>
                                                    <SelectItem value="xl">Extra Large</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Variant</label>
                                            <Select
                                                value={advancedRadioProps.variant}
                                                onValueChange={(value) => handleAdvancedRadioChange('variant', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="default">Default</SelectItem>
                                                    <SelectItem value="primary">Primary</SelectItem>
                                                    <SelectItem value="secondary">Secondary</SelectItem>
                                                    <SelectItem value="destructive">Destructive</SelectItem>
                                                    <SelectItem value="ghost">Ghost</SelectItem>
                                                    <SelectItem value="link">Link</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Error</label>
                                            <input
                                                type="text"
                                                value={advancedRadioProps.error}
                                                onChange={(e) => handleAdvancedRadioChange('error', e.target.value)}
                                                className="border border-gray-300 rounded-md p-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Hint</label>
                                            <input
                                                type="text"
                                                value={advancedRadioProps.hint}
                                                onChange={(e) => handleAdvancedRadioChange('hint', e.target.value)}
                                                className="border border-gray-300 rounded-md p-1"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>Checkbox Controls</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Density</label>
                                            <Select
                                                value={advancedCheckboxProps.density}
                                                onValueChange={(value) => handleAdvancedCheckboxChange('density', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="compact">Compact</SelectItem>
                                                    <SelectItem value="normal">Normal</SelectItem>
                                                    <SelectItem value="comfortable">Comfortable</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Size</label>
                                            <Select
                                                value={advancedCheckboxProps.size}
                                                onValueChange={(value) => handleAdvancedCheckboxChange('size', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="xs">Extra Small</SelectItem>
                                                    <SelectItem value="sm">Small</SelectItem>
                                                    <SelectItem value="md">Medium</SelectItem>
                                                    <SelectItem value="lg">Large</SelectItem>
                                                    <SelectItem value="xl">Extra Large</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Variant</label>
                                            <Select
                                                value={advancedCheckboxProps.variant}
                                                onValueChange={(value) => handleAdvancedCheckboxChange('variant', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="default">Default</SelectItem>
                                                    <SelectItem value="primary">Primary</SelectItem>
                                                    <SelectItem value="secondary">Secondary</SelectItem>
                                                    <SelectItem value="destructive">Destructive</SelectItem>
                                                    <SelectItem value="ghost">Ghost</SelectItem>
                                                    <SelectItem value="link">Link</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Animation</label>
                                            <Select
                                                value={advancedCheckboxProps.animation}
                                                onValueChange={(value) => handleAdvancedCheckboxChange('animation', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    <SelectItem value="subtle">Subtle</SelectItem>
                                                    <SelectItem value="smooth">Smooth</SelectItem>
                                                    <SelectItem value="energetic">Energetic</SelectItem>
                                                    <SelectItem value="playful">Playful</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Error</label>
                                            <input
                                                type="text"
                                                value={advancedCheckboxProps.error}
                                                onChange={(e) => handleAdvancedCheckboxChange('error', e.target.value)}
                                                className="border border-gray-300 rounded-md p-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Hint</label>
                                            <input
                                                type="text"
                                                value={advancedCheckboxProps.hint}
                                                onChange={(e) => handleAdvancedCheckboxChange('hint', e.target.value)}
                                                className="border border-gray-300 rounded-md p-1"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/!* Component Card *!/}
                        <div className="col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Advanced Radio Group</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxRadioGroup
                                        label="Choose an Option"
                                        layout={advancedRadioProps.layout}
                                        columns={advancedRadioProps.columns}
                                        density={advancedRadioProps.density}
                                        size={advancedRadioProps.size}
                                        variant={advancedRadioProps.variant}
                                        error={advancedRadioProps.error}
                                        hint={advancedRadioProps.hint}
                                    >
                                        <MatrxCheckbox
                                            field={{ name: 'option1', label: 'Option 1' }}
                                            checked={radioValue === 'option1'}
                                            onChange={() => setRadioValue('option1')}
                                        />
                                        <MatrxCheckbox
                                            field={{ name: 'option2', label: 'Option 2' }}
                                            checked={radioValue === 'option2'}
                                            onChange={() => setRadioValue('option2')}
                                        />
                                    </MatrxRadioGroup>
                                </CardContent>
                            </Card>

                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>Advanced Checkbox</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxCheckbox
                                        field={{ name: 'checkbox', label: 'Accept Terms' }}
                                        checked={checkboxValue}
                                        onChange={setCheckboxValue}
                                        density={advancedCheckboxProps.density}
                                        size={advancedCheckboxProps.size}
                                        variant={advancedCheckboxProps.variant}
                                        animation={advancedCheckboxProps.animation}
                                        error={advancedCheckboxProps.error}
                                        hint={advancedCheckboxProps.hint}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/!* State Display Card *!/}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ radioValue, checkboxValue, advancedRadioProps, advancedCheckboxProps }, null, 2)}</pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/!* All Variations Tab *!/}
                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Variations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TextDivider text="Vertical Layout" />
                            <MatrxRadioGroup
                                label="Choose an Option"
                                layout="vertical"
                                size="md"
                                density="normal"
                            >
                                <MatrxCheckbox
                                    field={{ name: 'option1', label: 'Option 1' }}
                                    checked={radioValue === 'option1'}
                                    onChange={() => setRadioValue('option1')}
                                />
                                <MatrxCheckbox
                                    field={{ name: 'option2', label: 'Option 2' }}
                                    checked={radioValue === 'option2'}
                                    onChange={() => setRadioValue('option2')}
                                />
                            </MatrxRadioGroup>

                            <TextDivider text="Horizontal Layout" />
                            <MatrxRadioGroup
                                label="Choose an Option"
                                layout="horizontal"
                                size="md"
                                density="normal"
                            >
                                <MatrxCheckbox
                                    field={{ name: 'option1', label: 'Option 1' }}
                                    checked={radioValue === 'option1'}
                                    onChange={() => setRadioValue('option1')}
                                />
                                <MatrxCheckbox
                                    field={{ name: 'option2', label: 'Option 2' }}
                                    checked={radioValue === 'option2'}
                                    onChange={() => setRadioValue('option2')}
                                />
                            </MatrxRadioGroup>

                            <TextDivider text="Grid Layout" />
                            <MatrxRadioGroup
                                label="Choose an Option"
                                layout="grid"
                                columns={2}
                                size="md"
                                density="normal"
                            >
                                <MatrxCheckbox
                                    field={{ name: 'option1', label: 'Option 1' }}
                                    checked={radioValue === 'option1'}
                                    onChange={() => setRadioValue('option1')}
                                />
                                <MatrxCheckbox
                                    field={{ name: 'option2', label: 'Option 2' }}
                                    checked={radioValue === 'option2'}
                                    onChange={() => setRadioValue('option2')}
                                />
                            </MatrxRadioGroup>

                            <TextDivider text="Checkbox Variants" />
                            <MatrxCheckbox
                                field={{ name: 'checkbox', label: 'Accept Terms' }}
                                checked={checkboxValue}
                                onChange={setCheckboxValue}
                                variant="primary"
                            />
                            <MatrxCheckbox
                                field={{ name: 'checkbox', label: 'Accept Terms' }}
                                checked={checkboxValue}
                                onChange={setCheckboxValue}
                                variant="secondary"
                            />
                            <MatrxCheckbox
                                field={{ name: 'checkbox', label: 'Accept Terms' }}
                                checked={checkboxValue}
                                onChange={setCheckboxValue}
                                variant="destructive"
                            />
                            <MatrxCheckbox
                                field={{ name: 'checkbox', label: 'Accept Terms' }}
                                checked={checkboxValue}
                                onChange={setCheckboxValue}
                                variant="ghost"
                            />
                            <MatrxCheckbox
                                field={{ name: 'checkbox', label: 'Accept Terms' }}
                                checked={checkboxValue}
                                onChange={setCheckboxValue}
                                variant="link"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
*/
