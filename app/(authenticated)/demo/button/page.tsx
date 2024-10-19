// '@/app/demo/button/page.tsx'
'use client';

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    MatrxButton,
    MatrxSelect,
    MatrxSelectContent, MatrxSelectItem,
    MatrxSelectTrigger,
    MatrxSelectValue
} from '@/components/ui/samples';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Checkbox,
    Input,
    Label
} from '@/components/ui';
import TextDivider from '@/components/matrx/TextDivider';
import {Infinity, Bot, Handshake, Smile, Loader2} from 'lucide-react';

export default function DemoPage() {
    const [basicButtonState, setBasicButtonState] = React.useState('default');
    const [advancedButtonState, setAdvancedButtonState] = React.useState({
        variant: 'default' as 'default' | 'link' | 'destructive' | 'outline' | 'secondary' | 'ghost',
        size: 'default' as 'default' | 's' | 'xs' | 'sm' | 'm' | 'l' | 'lg' | 'xl' | 'icon',
        animation: 'basic' as 'basic' | 'none' | 'moderate' | 'enhanced',
        fullWidth: false,
        loading: false,
        ripple: false,
        tooltip: '',
        dropdown: false,
        count: 0,
        icon: undefined as React.ReactNode | undefined,
    });

    const iconOptions = [
        { value: 'none', label: 'None', icon: null },
        { value: 'infinity', label: 'Infinity', icon: <Infinity /> },
        { value: 'bot', label: 'Bot', icon: <Bot /> },
        { value: 'handshake', label: 'Handshake', icon: <Handshake /> },
        { value: 'smile', label: 'Smile', icon: <Smile /> },
    ]
    const [selectedIcon, setSelectedIcon] = React.useState('none')

    const handleAdvancedChange = (key: string, value: any) => {
        setAdvancedButtonState((prevState) => ({
            ...prevState,
            [key]: value,
        }));
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Demo of the MatrxButton Component</h1>

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
                            <CardTitle>Basic Button</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MatrxButton
                                variant="default"
                                size="m"
                                onClick={() => setBasicButtonState('clicked')}
                            >
                                Basic Button
                            </MatrxButton>
                        </CardContent>
                    </Card>
                    {/* State Display Card */}
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Current State</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre>{JSON.stringify({ basicButtonState }, null, 2)}</pre>
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
                                                value={advancedButtonState.variant}
                                                onValueChange={(value) => handleAdvancedChange('variant', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="default">Default</SelectItem>
                                                    <SelectItem value="destructive">Destructive</SelectItem>
                                                    <SelectItem value="outline">Outline</SelectItem>
                                                    <SelectItem value="secondary">Secondary</SelectItem>
                                                    <SelectItem value="ghost">Ghost</SelectItem>
                                                    <SelectItem value="link">Link</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Size</Label>
                                            <Select
                                                value={advancedButtonState.size}
                                                onValueChange={(value) => handleAdvancedChange('size', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="xs">Extra Small</SelectItem>
                                                    <SelectItem value="s">Small</SelectItem>
                                                    <SelectItem value="sm">Small Medium</SelectItem>
                                                    <SelectItem value="m">Medium</SelectItem>
                                                    <SelectItem value="l">Large</SelectItem>
                                                    <SelectItem value="lg">Extra Large</SelectItem>
                                                    <SelectItem value="xl">Extra Extra Large</SelectItem>
                                                    <SelectItem value="icon">Icon</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Animation</Label>
                                            <Select
                                                value={advancedButtonState.animation}
                                                onValueChange={(value) => handleAdvancedChange('animation', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
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
                                            <Label className="block text-sm font-medium mb-1">Full Width</Label>
                                            <Checkbox
                                                checked={advancedButtonState.fullWidth}
                                                onCheckedChange={(checked) => handleAdvancedChange('fullWidth', checked)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Loading</Label>
                                            <Checkbox
                                                checked={advancedButtonState.loading}
                                                onCheckedChange={(checked) => handleAdvancedChange('loading', checked)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Ripple</Label>
                                            <Checkbox
                                                checked={advancedButtonState.ripple}
                                                onCheckedChange={(checked) => handleAdvancedChange('ripple', checked)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Tooltip</Label>
                                            <Input
                                                type="text"
                                                value={advancedButtonState.tooltip}
                                                onChange={(e) => handleAdvancedChange('tooltip', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Dropdown</Label>
                                            <Checkbox
                                                checked={advancedButtonState.dropdown}
                                                onCheckedChange={(checked) => handleAdvancedChange('dropdown', checked)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Count</Label>
                                            <Input
                                                type="number"
                                                value={advancedButtonState.count}
                                                onChange={(e) => handleAdvancedChange('count', Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-sm font-medium mb-1">Icon</Label>
                                            <MatrxSelect
                                                value={selectedIcon}
                                                onValueChange={(value) => {
                                                    setSelectedIcon(value)
                                                    handleAdvancedChange('icon', iconOptions.find(option => option.value === value)?.icon || null)
                                                }}
                                            >
                                                <MatrxSelectTrigger>
                                                    <MatrxSelectValue/>
                                                </MatrxSelectTrigger>
                                                <MatrxSelectContent>
                                                    {iconOptions.map((option) => (
                                                        <MatrxSelectItem key={option.value} value={option.value}>
                                                            {option.icon && <span className="mr-2">{option.icon}</span>}
                                                            {option.label}
                                                        </MatrxSelectItem>
                                                    ))}
                                                </MatrxSelectContent>
                                            </MatrxSelect>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Component Card */}
                        <div className="col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Advanced Button</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxButton
                                        variant={advancedButtonState.variant}
                                        size={advancedButtonState.size}
                                        animation={advancedButtonState.animation}
                                        fullWidth={advancedButtonState.fullWidth}
                                        loading={advancedButtonState.loading}
                                        ripple={advancedButtonState.ripple}
                                        tooltip={advancedButtonState.tooltip}
                                        dropdown={advancedButtonState.dropdown}
                                        count={advancedButtonState.count}
                                        icon={advancedButtonState.icon}
                                        onClick={() => handleAdvancedChange('count', advancedButtonState.count + 1)}
                                    >
                                        Advanced Button
                                    </MatrxButton>
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
                            <pre>{JSON.stringify(advancedButtonState, null, 2)}</pre>
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
                            <TextDivider text="Default Variant" />
                            <MatrxButton variant="default">Default Button</MatrxButton>

                            <TextDivider text="Destructive Variant" />
                            <MatrxButton variant="destructive">Destructive Button</MatrxButton>

                            <TextDivider text="Outline Variant" />
                            <MatrxButton variant="outline">Outline Button</MatrxButton>

                            <TextDivider text="Secondary Variant" />
                            <MatrxButton variant="secondary">Secondary Button</MatrxButton>

                            <TextDivider text="Ghost Variant" />
                            <MatrxButton variant="ghost">Ghost Button</MatrxButton>

                            <TextDivider text="Link Variant" />
                            <MatrxButton variant="link">Link Button</MatrxButton>

                            <TextDivider text="With Icon" />
                            <MatrxButton icon={<Loader2 className="h-4 w-4" />}>Button with Icon</MatrxButton>

                            <TextDivider text="With Dropdown" />
                            <MatrxButton dropdown>Button with Dropdown</MatrxButton>

                            <TextDivider text="With Count" />
                            <MatrxButton count={5}>Button with Count</MatrxButton>

                            <TextDivider text="Full Width" />
                            <MatrxButton fullWidth>Full Width Button</MatrxButton>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
