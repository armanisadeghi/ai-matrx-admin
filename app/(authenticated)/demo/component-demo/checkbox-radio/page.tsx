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
import { MatrxRadioGroup, MatrxRadioGroupItem } from '@/components/ui/samples';
import MatrxCheckbox from '@/components/matrx/MatrxCheckbox';

// Define the types from the component
type Orientation = 'horizontal' | 'vertical';
type Size = 'xs' | 's' | 'm' | 'lg' | 'xl';
type AnimationLevel = 'none' | 'minimal' | 'full';

export default function DemoPage() {
    const [radioValue, setRadioValue] = useState('option1');
    const [checkboxValue, setCheckboxValue] = useState(false);
    const [advancedRadioProps, setAdvancedRadioProps] = useState<{
        orientation: Orientation;
        gap: Size;
        animationLevel: AnimationLevel;
    }>({
        orientation: 'vertical',
        gap: 'm',
        animationLevel: 'full',
    });

    const [advancedCheckboxProps, setAdvancedCheckboxProps] = useState({
        id: 'demoCheckbox',
        lineThrough: false,
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

                {/* Basic Example Tab */}
                <TabsContent value="basic">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Radio Group</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MatrxRadioGroup 
                                value={radioValue} 
                                onValueChange={setRadioValue}
                                orientation="vertical"
                                className="space-y-2"
                            >
                                <MatrxRadioGroupItem value="option1" label="Option 1" />
                                <MatrxRadioGroupItem value="option2" label="Option 2" />
                            </MatrxRadioGroup>
                        </CardContent>
                    </Card>

                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Basic Checkbox</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MatrxCheckbox
                                id="terms"
                                checked={checkboxValue}
                                onChange={setCheckboxValue}
                            >
                                <MatrxCheckbox.Indicator />
                                <MatrxCheckbox.Label>Accept Terms</MatrxCheckbox.Label>
                            </MatrxCheckbox>
                        </CardContent>
                    </Card>

                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ radioValue, checkboxValue }, null, 2)}</pre>
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
                                    <CardTitle>Radio Group Controls</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Orientation</label>
                                            <Select
                                                value={advancedRadioProps.orientation}
                                                onValueChange={(value) => handleAdvancedRadioChange('orientation', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="vertical">Vertical</SelectItem>
                                                    <SelectItem value="horizontal">Horizontal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Gap</label>
                                            <Select
                                                value={advancedRadioProps.gap}
                                                onValueChange={(value) => handleAdvancedRadioChange('gap', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="xs">Extra Small</SelectItem>
                                                    <SelectItem value="s">Small</SelectItem>
                                                    <SelectItem value="m">Medium</SelectItem>
                                                    <SelectItem value="lg">Large</SelectItem>
                                                    <SelectItem value="xl">Extra Large</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Animation Level</label>
                                            <Select
                                                value={advancedRadioProps.animationLevel}
                                                onValueChange={(value) => handleAdvancedRadioChange('animationLevel', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    <SelectItem value="minimal">Minimal</SelectItem>
                                                    <SelectItem value="full">Full</SelectItem>
                                                </SelectContent>
                                            </Select>
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
                                            <label className="block text-sm font-medium mb-1">Line Through</label>
                                            <Select
                                                value={advancedCheckboxProps.lineThrough ? "true" : "false"}
                                                onValueChange={(value) => handleAdvancedCheckboxChange('lineThrough', value === "true")}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">Enabled</SelectItem>
                                                    <SelectItem value="false">Disabled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Component Card */}
                        <div className="col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Advanced Radio Group</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxRadioGroup
                                        value={radioValue}
                                        onValueChange={setRadioValue}
                                        orientation={advancedRadioProps.orientation}
                                        gap={advancedRadioProps.gap}
                                        animationLevel={advancedRadioProps.animationLevel}
                                    >
                                        <MatrxRadioGroupItem value="option1" label="Option 1" />
                                        <MatrxRadioGroupItem value="option2" label="Option 2" />
                                    </MatrxRadioGroup>
                                </CardContent>
                            </Card>

                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>Advanced Checkbox</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxCheckbox
                                        id={advancedCheckboxProps.id}
                                        checked={checkboxValue}
                                        onChange={setCheckboxValue}
                                        lineThrough={advancedCheckboxProps.lineThrough}
                                    >
                                        <MatrxCheckbox.Indicator />
                                        <MatrxCheckbox.Label>Accept Terms</MatrxCheckbox.Label>
                                    </MatrxCheckbox>
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
                            <pre>{JSON.stringify({ radioValue, checkboxValue, advancedRadioProps, advancedCheckboxProps }, null, 2)}</pre>
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
                            <TextDivider text="Vertical Layout" />
                            <MatrxRadioGroup
                                value={radioValue}
                                onValueChange={setRadioValue}
                                orientation="vertical"
                            >
                                <MatrxRadioGroupItem value="option1" label="Option 1" />
                                <MatrxRadioGroupItem value="option2" label="Option 2" />
                            </MatrxRadioGroup>

                            <TextDivider text="Horizontal Layout" />
                            <MatrxRadioGroup
                                value={radioValue}
                                onValueChange={setRadioValue}
                                orientation="horizontal"
                            >
                                <MatrxRadioGroupItem value="option1" label="Option 1" />
                                <MatrxRadioGroupItem value="option2" label="Option 2" />
                            </MatrxRadioGroup>

                            <TextDivider text="Checkbox Variations" />
                            <div className="space-y-2">
                                <MatrxCheckbox
                                    id="checkbox1"
                                    checked={checkboxValue}
                                    onChange={setCheckboxValue}
                                >
                                    <MatrxCheckbox.Indicator />
                                    <MatrxCheckbox.Label>Default Checkbox</MatrxCheckbox.Label>
                                </MatrxCheckbox>
                                
                                <MatrxCheckbox
                                    id="checkbox2"
                                    checked={checkboxValue}
                                    onChange={setCheckboxValue}
                                    lineThrough={true}
                                >
                                    <MatrxCheckbox.Indicator />
                                    <MatrxCheckbox.Label>Checkbox with Line-through</MatrxCheckbox.Label>
                                </MatrxCheckbox>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

