// '@/app/demo/component-demo/json-viewer/page.tsx'

'use client';

import {useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    MatrxJsonViewer,
    MatrxFullJsonViewer
} from '@/components/matrx/AnimatedForm/separated/components/MatrxJsonViewer';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select';
import TextDivider from '@/components/matrx/TextDivider';
import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    ComponentVariant
} from "@/types/componentConfigTypes";

const sampleJsonData = {
    name: "John Doe",
    age: 30,
    isActive: true,
    address: {
        street: "123 Main St",
        city: "Anytown",
        zip: "12345"
    },
    hobbies: ["reading", "gaming", "hiking"],
    details: {
        employment: {
            company: "Tech Corp",
            position: "Developer",
            years: 5
        },
        education: {
            degree: "Computer Science",
            university: "Tech University"
        }
    }
};

interface JsonViewerState {
    size: ComponentSize;
    density: ComponentDensity;
    variant: ComponentVariant;
    animation: AnimationPreset;
    initialExpanded: boolean;
    maxHeight: string;
    hideControls: boolean;
}

export default function DemoPage() {
    const [jsonViewerState, setJsonViewerState] = useState<JsonViewerState>({
        size: 'md',
        density: 'normal',
        variant: 'default',
        animation: 'subtle',
        initialExpanded: false,
        maxHeight: '400px',
        hideControls: false,
    });

    const handleJsonViewerChange = <K extends keyof JsonViewerState>(
        key: K,
        value: JsonViewerState[K]
    ) => {
        setJsonViewerState((prevState) => ({
            ...prevState,
            [key]: value,
        }));
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Demo of the MatrxJsonViewer Component</h1>

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
                            <CardTitle>Basic JSON Viewer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MatrxJsonViewer data={sampleJsonData}/>
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
                                            <Select
                                                value={jsonViewerState.size}
                                                onValueChange={(value) =>
                                                    handleJsonViewerChange('size', value as ComponentSize)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
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
                                            <label className="block text-sm font-medium mb-1">Density</label>
                                            <Select
                                                value={jsonViewerState.density}
                                                onValueChange={(value) =>
                                                    handleJsonViewerChange('density', value as ComponentDensity)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="compact">Compact</SelectItem>
                                                    <SelectItem value="normal">Normal</SelectItem>
                                                    <SelectItem value="comfortable">Comfortable</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Variant</label>
                                            <Select
                                                value={jsonViewerState.variant}
                                                onValueChange={(value) =>
                                                    handleJsonViewerChange('variant', value as ComponentVariant)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
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
                                                value={jsonViewerState.animation}
                                                onValueChange={(value) =>
                                                    handleJsonViewerChange('animation', value as AnimationPreset)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue/>
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
                                            <label className="block text-sm font-medium mb-1">Initial Expanded</label>
                                            <input
                                                type="checkbox"
                                                checked={jsonViewerState.initialExpanded}
                                                onChange={(e) => handleJsonViewerChange('initialExpanded', e.target.checked)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Hide Controls</label>
                                            <input
                                                type="checkbox"
                                                checked={jsonViewerState.hideControls}
                                                onChange={(e) => handleJsonViewerChange('hideControls', e.target.checked)}
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
                                    <CardTitle>Advanced JSON Viewer</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxJsonViewer
                                        data={sampleJsonData}
                                        size={jsonViewerState.size}
                                        density={jsonViewerState.density}
                                        variant={jsonViewerState.variant}
                                        animation={jsonViewerState.animation}
                                        initialExpanded={jsonViewerState.initialExpanded}
                                        hideControls={jsonViewerState.hideControls}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* All Variations Tab */}
                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Variations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TextDivider text="Compact Density"/>
                            <MatrxJsonViewer data={sampleJsonData} density="compact"/>

                            <TextDivider text="Normal Density"/>
                            <MatrxJsonViewer data={sampleJsonData} density="normal"/>

                            <TextDivider text="Comfortable Density"/>
                            <MatrxJsonViewer data={sampleJsonData} density="comfortable"/>

                            <TextDivider text="With Title"/>
                            <MatrxFullJsonViewer data={sampleJsonData} title="Sample JSON Data"/>

                            <TextDivider text="Without Title"/>
                            <MatrxFullJsonViewer data={sampleJsonData} hideTitle/>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
