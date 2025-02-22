// app/(authenticated)/tests/json-components-demo/hold-hold-page.tsx

'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import JsonDemoComponent from './components/JsonDemoComponent';
import EnhancedJsonDemoComponent from './components/EnhancedJsonDemoComponent';

export default function JsonComponentsDemoPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">JSON Components Demo</h1>
            <Tabs defaultValue="original" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="original">Original Demo</TabsTrigger>
                    <TabsTrigger value="enhanced">Enhanced Demo</TabsTrigger>
                </TabsList>
                <TabsContent value="original">
                    <JsonDemoComponent />
                </TabsContent>
                <TabsContent value="enhanced">
                    <EnhancedJsonDemoComponent />
                </TabsContent>
            </Tabs>
        </div>
    );
}
