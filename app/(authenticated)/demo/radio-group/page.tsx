'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MatrxRadioGroup, MatrxRadioGroupItem } from '@/components/ui/samples';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select';
import TextDivider from '@/components/matrx/TextDivider';

export default function DemoPage() {
    const [basicValue, setBasicValue] = useState('option1');
    const [advancedValue, setAdvancedValue] = useState('option1');
    const [animationLevel, setAnimationLevel] = useState('full');
    const [orientation, setOrientation] = useState('vertical');
    const [size, setSize] = useState('m');

    const handleBasicChange = (value: string) => {
        setBasicValue(value);
    };

    const handleAdvancedChange = (value: string) => {
        setAdvancedValue(value);
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Demo of the MatrxRadioGroup Component</h1>

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
                            <MatrxRadioGroup value={basicValue} onValueChange={handleBasicChange}>
                                <MatrxRadioGroupItem
                                    value="option1"
                                    label="Option 1"
                                    description="This is the first option"
                                />
                                <MatrxRadioGroupItem
                                    value="option2"
                                    label="Option 2"
                                    description="This is the second option"
                                />
                                <MatrxRadioGroupItem
                                    value="option3"
                                    label="Option 3"
                                    description="This is the third option"
                                />
                            </MatrxRadioGroup>
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
                                            <label className="block text-sm font-medium mb-1">Animation Level</label>
                                            <Select value={animationLevel} onValueChange={setAnimationLevel}>
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
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Orientation</label>
                                            <Select value={orientation} onValueChange={setOrientation}>
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
                                            <label className="block text-sm font-medium mb-1">Size</label>
                                            <Select value={size} onValueChange={setSize}>
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
                                        value={advancedValue}
                                        onValueChange={handleAdvancedChange}
                                        orientation={orientation as 'horizontal' | 'vertical'}
                                        animationLevel={animationLevel as 'none' | 'minimal' | 'full'}
                                    >
                                        <MatrxRadioGroupItem
                                            value="option1"
                                            label="Eco-Friendly"
                                            description="Made from recycled materials"
                                            size={size as 'xs' | 's' | 'm' | 'lg' | 'xl'}
                                        />
                                        <MatrxRadioGroupItem
                                            value="option2"
                                            label="High Performance"
                                            description="Optimized for speed and efficiency"
                                            size={size as 'xs' | 's' | 'm' | 'lg' | 'xl'}
                                        />
                                        <MatrxRadioGroupItem
                                            value="option3"
                                            label="Luxury Edition"
                                            description="Premium materials and finish"
                                            size={size as 'xs' | 's' | 'm' | 'lg' | 'xl'}
                                        />
                                    </MatrxRadioGroup>
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
                            <pre>{JSON.stringify({ advancedValue, animationLevel, orientation, size }, null, 2)}</pre>
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
                            <TextDivider text="Vertical Orientation" />
                            <MatrxRadioGroup orientation="vertical" value={basicValue} onValueChange={handleBasicChange}>
                                <MatrxRadioGroupItem value="option1" label="Option 1" />
                                <MatrxRadioGroupItem value="option2" label="Option 2" />
                                <MatrxRadioGroupItem value="option3" label="Option 3" />
                            </MatrxRadioGroup>

                            <TextDivider text="Horizontal Orientation" />
                            <MatrxRadioGroup orientation="horizontal" value={basicValue} onValueChange={handleBasicChange}>
                                <MatrxRadioGroupItem value="option1" label="Option 1" />
                                <MatrxRadioGroupItem value="option2" label="Option 2" />
                                <MatrxRadioGroupItem value="option3" label="Option 3" />
                            </MatrxRadioGroup>

                            <TextDivider text="Without Descriptions" />
                            <MatrxRadioGroup value={basicValue} onValueChange={handleBasicChange}>
                                <MatrxRadioGroupItem value="option1" label="Option 1" />
                                <MatrxRadioGroupItem value="option2" label="Option 2" />
                                <MatrxRadioGroupItem value="option3" label="Option 3" />
                            </MatrxRadioGroup>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
