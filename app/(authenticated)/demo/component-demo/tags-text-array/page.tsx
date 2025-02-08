'use client';

import { useState } from 'react';
import TextArrayInput from "@/components/ui/matrx/TextArrayInput";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TextInputDemo() {
    // State for the controlled examples
    const [basicTags, setBasicTags] = useState(['react', 'nextjs']);
    const [allowDuplicates, setAllowDuplicates] = useState(['item 1']);
    const [customTags, setCustomTags] = useState(['violet', 'indigo', 'blue']);

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-3xl">
            <h1 className="text-3xl font-bold mb-8">TextArrayInput Examples</h1>

            {/* Basic Usage */}
            <Card>
                <CardHeader>
                    <CardTitle>Basic Usage</CardTitle>
                    <CardDescription>
                        Default configuration with unique filtering. Try typing "react, vue, angular"
                        to add multiple items at once.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TextArrayInput
                        value={basicTags}
                        onChange={setBasicTags}
                        placeholder="Add technologies..."
                    />
                    <div className="mt-2 text-sm text-muted-foreground">
                        Current value: {JSON.stringify(basicTags)}
                    </div>
                </CardContent>
            </Card>

            {/* Allow Duplicates */}
            <Card>
                <CardHeader>
                    <CardTitle>Allow Duplicates</CardTitle>
                    <CardDescription>
                        Set uniqueFilter to false to allow duplicate entries.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TextArrayInput
                        value={allowDuplicates}
                        onChange={setAllowDuplicates}
                        uniqueFilter={false}
                        placeholder="Add items (duplicates allowed)..."
                    />
                    <div className="mt-2 text-sm text-muted-foreground">
                        Current value: {JSON.stringify(allowDuplicates)}
                    </div>
                </CardContent>
            </Card>

            {/* Custom Styling */}
            <Card>
                <CardHeader>
                    <CardTitle>Custom Styled Chips</CardTitle>
                    <CardDescription>
                        Customize the appearance using chipClassName.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Gradient Style */}
                    <div>
                        <p className="text-sm font-medium mb-2">Gradient Style:</p>
                        <TextArrayInput
                            value={customTags}
                            onChange={setCustomTags}
                            chipClassName="bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
                            placeholder="Add colorful tags..."
                        />
                    </div>

                    {/* Outline Style */}
                    <div>
                        <p className="text-sm font-medium mb-2">Outline Style:</p>
                        <TextArrayInput
                            placeholder="Add outlined tags..."
                            chipClassName="border-2 border-blue-500 text-blue-500 bg-transparent hover:bg-blue-50"
                        />
                    </div>

                    {/* Solid Style */}
                    <div>
                        <p className="text-sm font-medium mb-2">Solid Style:</p>
                        <TextArrayInput
                            placeholder="Add solid tags..."
                            chipClassName="bg-green-100 text-green-800 border border-green-200"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Uncontrolled Example */}
            <Card>
                <CardHeader>
                    <CardTitle>Uncontrolled Component</CardTitle>
                    <CardDescription>
                        Basic usage without external state management.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TextArrayInput 
                        placeholder="Add items (internal state)..."
                    />
                </CardContent>
            </Card>
        </div>
    );
}