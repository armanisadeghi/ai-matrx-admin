// '@/app/demo/accordion/page.tsx'
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    MatrxAccordion,
    MatrxAccordionItem,
    MatrxAccordionTrigger,
    MatrxAccordionContent,
} from '@/components/ui/samples';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Checkbox,
    Label
} from '@/components/ui';
import TextDivider from '@/components/matrx/TextDivider';

export default function DemoPage() {
    const [basicAccordionState, setBasicAccordionState] = React.useState<string[]>([]);
    const [advancedAccordionState, setAdvancedAccordionState] = React.useState<string[]>([]);
    const [animationLevel, setAnimationLevel] = React.useState<'none' | 'basic' | 'moderate' | 'enhanced'>('enhanced');
    const [persistState, setPersistState] = React.useState(false);
    const [accordionType, setAccordionType] = React.useState<'single' | 'multiple'>('single');

    const handleBasicStateChange = (value: string | string[]) => {
        const newValue = Array.isArray(value) ? value : [value];
        setBasicAccordionState(newValue);
    };

    const handleAdvancedStateChange = (value: string | string[]) => {
        const newValue = Array.isArray(value) ? value : [value];
        setAdvancedAccordionState(newValue);
    };

    const accordionItems = [
        {
            value: 'item1',
            trigger: 'Item 1',
            content: 'Content for item 1',
        },
        {
            value: 'item2',
            trigger: 'Item 2',
            content: 'Content for item 2',
        },
        {
            value: 'item3',
            trigger: 'Item 3',
            content: 'Content for item 3',
        },
    ];

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Demo of the MatrxAccordion Component</h1>

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
                            <CardTitle>Basic Accordion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MatrxAccordion
                                type="single"
                                animationLevel="enhanced"
                                onValueChange={handleBasicStateChange}
                            >
                                {accordionItems.map((item) => (
                                    <MatrxAccordionItem key={item.value} value={item.value}>
                                        <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                        <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                    </MatrxAccordionItem>
                                ))}
                            </MatrxAccordion>
                        </CardContent>
                    </Card>
                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ basicAccordionState }, null, 2)}</pre>
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
                                            <Label className="block text-sm font-medium mb-1">Accordion Type</Label>
                                            <Select
                                                value={accordionType}
                                                onValueChange={(value) => setAccordionType(value as 'single' | 'multiple')}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="single">Single</SelectItem>
                                                    <SelectItem value="multiple">Multiple</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Animation Level</Label>
                                            <Select
                                                value={animationLevel}
                                                onValueChange={(value) => setAnimationLevel(value as 'none' | 'basic' | 'moderate' | 'enhanced')}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    <SelectItem value="basic">Basic</SelectItem>
                                                    <SelectItem value="moderate">Moderate</SelectItem>
                                                    <SelectItem value="enhanced">Enhanced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Persist State</Label>
                                            <Checkbox
                                                checked={persistState}
                                                onCheckedChange={(checked) => setPersistState(checked === true)}
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
                                    <CardTitle>Advanced Accordion</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxAccordion
                                        type={accordionType}
                                        animationLevel={animationLevel}
                                        persistState={persistState}
                                        onValueChange={handleAdvancedStateChange}
                                    >
                                        {accordionItems.map((item) => (
                                            <MatrxAccordionItem key={item.value} value={item.value}>
                                                <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                                <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                            </MatrxAccordionItem>
                                        ))}
                                    </MatrxAccordion>
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
                            <pre>{JSON.stringify({ advancedAccordionState, animationLevel, persistState, accordionType }, null, 2)}</pre>
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
                            <TextDivider text="Single Type" />
                            <MatrxAccordion type="single" animationLevel="enhanced">
                                {accordionItems.map((item) => (
                                    <MatrxAccordionItem key={item.value} value={item.value}>
                                        <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                        <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                    </MatrxAccordionItem>
                                ))}
                            </MatrxAccordion>

                            <TextDivider text="Multiple Type" />
                            <MatrxAccordion type="multiple" animationLevel="enhanced">
                                {accordionItems.map((item) => (
                                    <MatrxAccordionItem key={item.value} value={item.value}>
                                        <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                        <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                    </MatrxAccordionItem>
                                ))}
                            </MatrxAccordion>

                            <TextDivider text="No Animation" />
                            <MatrxAccordion type="single" animationLevel="none">
                                {accordionItems.map((item) => (
                                    <MatrxAccordionItem key={item.value} value={item.value}>
                                        <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                        <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                    </MatrxAccordionItem>
                                ))}
                            </MatrxAccordion>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
