'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    MatrxJsonViewer,
    MatrxFullJsonViewer
} from '@/components/matrx/AnimatedForm/separated/components/MatrxJsonViewer';

const sampleData = {
    simpleValues: {
        string: "Hello World",
        number: 42,
        boolean: true,
        null: null
    },
    array: [1, 2, 3, 4, 5],
    mixedArray: [
        "string",
        42,
        true,
        null,
        { nested: "object" },
        [1, 2, 3]
    ],
    nestedObject: {
        level1: {
            level2: {
                level3: {
                    deep: "value"
                }
            }
        }
    },
    complexArray: [
        {
            id: 1,
            name: "Item 1",
            details: {
                description: "First item",
                tags: ["tag1", "tag2"]
            }
        },
        {
            id: 2,
            name: "Item 2",
            details: {
                description: "Second item",
                tags: ["tag3", "tag4"]
            }
        }
    ],
    largeArray: Array.from({ length: 10 }, (_, i) => ({
        id: i,
        value: `Item ${i}`,
        timestamp: new Date().toISOString()
    }))
};

export default function JsonViewerTestPage() {
    return (
        <div className="container mx-auto p-8 space-y-8">
            <h1 className="text-3xl font-bold mb-8">JSON Viewer Component Tests</h1>

            {/* Basic JSON Viewer */}
            <Card>
                <CardHeader>
                    <CardTitle>Basic JSON Viewer</CardTitle>
                </CardHeader>
                <CardContent>
                    <MatrxJsonViewer
                        data={sampleData}
                        initialExpanded={true}
                    />
                </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* Different Densities */}
            <Card>
                <CardHeader>
                    <CardTitle>Density Variations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="text-lg font-medium mb-4">Compact Density</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            density="compact"
                            initialExpanded
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4">Normal Density</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            density="normal"
                            initialExpanded
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4">Comfortable Density</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            density="comfortable"
                            initialExpanded
                        />
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* Different Sizes */}
            <Card>
                <CardHeader>
                    <CardTitle>Size Variations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="text-lg font-medium mb-4">Extra Small</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            size="xs"
                            initialExpanded
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4">Small</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            size="sm"
                            initialExpanded
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4">Medium (Default)</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            size="md"
                            initialExpanded
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4">Large</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            size="lg"
                            initialExpanded
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4">Extra Large</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            size="xl"
                            initialExpanded
                        />
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* Different Variants */}
            <Card>
                <CardHeader>
                    <CardTitle>Variant Tests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {['default', 'primary', 'secondary', 'destructive', 'ghost'].map((variant) => (
                        <div key={variant}>
                            <h3 className="text-lg font-medium mb-4 capitalize">{variant} Variant</h3>
                            <MatrxJsonViewer
                                data={sampleData.simpleValues}
                                variant={variant as any}
                                initialExpanded
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* Full JSON Viewer */}
            <Card>
                <CardHeader>
                    <CardTitle>Full JSON Viewer Tests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="text-lg font-medium mb-4">With Title</h3>
                        <MatrxFullJsonViewer
                            data={sampleData.complexArray}
                            title="Complex Array Data"
                            initialExpanded
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4">Without Title</h3>
                        <MatrxFullJsonViewer
                            data={sampleData.complexArray}
                            hideTitle
                            initialExpanded
                        />
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* State Tests */}
            <Card>
                <CardHeader>
                    <CardTitle>State Tests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="text-lg font-medium mb-4">Disabled State</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            disabled
                            initialExpanded
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4">Error State</h3>
                        <MatrxJsonViewer
                            data={sampleData.simpleValues}
                            error="Something went wrong"
                            initialExpanded
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

