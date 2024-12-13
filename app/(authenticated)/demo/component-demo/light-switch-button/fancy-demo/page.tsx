// '@/app/demo/component-demo/toggle-switch/page.tsx'
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
import LightSwitchToggle from '@/components/matrx/LightSwitchToggle';
import { Input, Label } from '@/components/ui';

export default function DemoPage() {
    const [basicSwitchState, setBasicSwitchState] = useState(false);
    const [advancedSwitchProps, setAdvancedSwitchProps] = useState({
        variant: 'rounded',
        width: 'w-48',
        height: 'h-16',
        labels: { on: 'ON', off: 'OFF' },
        disabled: false,
    });

    const handleAdvancedChange = (key: string, value: any) => {
        setAdvancedSwitchProps((prevState) => ({
            ...prevState,
            [key]: value,
        }));
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Demo of the LightSwitchToggle Component</h1>

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
                            <CardTitle>Basic Toggle Switch</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <LightSwitchToggle
                                variant="rounded"
                                defaultValue={basicSwitchState}
                                onChange={setBasicSwitchState}
                                labels={{ on: 'ON', off: 'OFF' }}
                            />
                        </CardContent>
                    </Card>
                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ basicSwitchState }, null, 2)}</pre>
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
                                            <Label className="block text-sm font-medium mb-1">Variant</Label>
                                            <Select
                                                value={advancedSwitchProps.variant}
                                                onValueChange={(value) => handleAdvancedChange('variant', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="rounded">Rounded</SelectItem>
                                                    <SelectItem value="geometric">Geometric</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Width</Label>
                                            <Select
                                                value={advancedSwitchProps.width}
                                                onValueChange={(value) => handleAdvancedChange('width', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="w-32">32</SelectItem>
                                                    <SelectItem value="w-48">48</SelectItem>
                                                    <SelectItem value="w-64">64</SelectItem>
                                                    <SelectItem value="w-80">80</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Height</Label>
                                            <Select
                                                value={advancedSwitchProps.height}
                                                onValueChange={(value) => handleAdvancedChange('height', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="h-10">10</SelectItem>
                                                    <SelectItem value="h-12">12</SelectItem>
                                                    <SelectItem value="h-16">16</SelectItem>
                                                    <SelectItem value="h-20">20</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Labels</Label>
                                            <Input
                                                type="text"
                                                placeholder="On Label"
                                                value={advancedSwitchProps.labels.on}
                                                onChange={(e) => handleAdvancedChange('labels', { ...advancedSwitchProps.labels, on: e.target.value })}
                                                className="border border-gray-300 rounded-md p-1 mb-2"
                                            />
                                            <Input
                                                type="text"
                                                placeholder="Off Label"
                                                value={advancedSwitchProps.labels.off}
                                                onChange={(e) => handleAdvancedChange('labels', { ...advancedSwitchProps.labels, off: e.target.value })}
                                                className="border border-gray-300 rounded-md p-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Disabled</Label>
                                            <Input
                                                type="checkbox"
                                                checked={advancedSwitchProps.disabled}
                                                onChange={(e) => handleAdvancedChange('disabled', e.target.checked)}
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
                                    <CardTitle>Advanced Toggle Switch</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <LightSwitchToggle
                                        variant={advancedSwitchProps.variant}
                                        width={advancedSwitchProps.width}
                                        height={advancedSwitchProps.height}
                                        labels={advancedSwitchProps.labels}
                                        disabled={advancedSwitchProps.disabled}
                                        onChange={setBasicSwitchState}
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
                            <pre>{JSON.stringify({ basicSwitchState, advancedSwitchProps }, null, 2)}</pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* All Variations Tab */}
                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Variations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <TextDivider text="Variants" />
                            <div className="flex flex-wrap gap-4">
                                <LightSwitchToggle
                                    variant="rounded"
                                    labels={{ on: 'ON', off: 'OFF' }}
                                />
                                <LightSwitchToggle
                                    variant="geometric"
                                    labels={{ on: 'ON', off: 'OFF' }}
                                />
                            </div>

                            <TextDivider text="Custom Dimensions 12x64" />
                            <div className="flex flex-wrap gap-4">
                                <LightSwitchToggle
                                    variant="rounded"
                                    width="w-64"
                                    height="h-12"
                                    labels={{ on: 'Multi Select', off: 'Single Select' }}
                                />
                                <TextDivider text="Custom Dimensions 10x120" />
                                <LightSwitchToggle
                                    variant="geometric"
                                    width="w-120"
                                    height="h-10"
                                    labels={{ on: 'Show Advanced Options', off: 'Hide Advanced Options' }}
                                />
                                <TextDivider text="Custom Dimensions 32x32" />
                                <LightSwitchToggle
                                    variant="rounded"
                                    width="w-32"
                                    height="h-32"
                                    labels={{ on: 'YES', off: 'NO' }}
                                />
                            </div>

                            <TextDivider text="Disabled State" />
                            <div className="flex flex-wrap gap-4">
                                <LightSwitchToggle
                                    variant="rounded"
                                    labels={{ on: 'ON', off: 'OFF' }}
                                    disabled
                                />
                                <LightSwitchToggle
                                    variant="geometric"
                                    labels={{ on: 'ON', off: 'OFF' }}
                                    disabled
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
