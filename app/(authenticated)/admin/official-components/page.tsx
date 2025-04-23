// File: app/(authenticated)/admin/official-components/page.tsx

'use client';

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { componentList } from './component-list';
import dynamic from 'next/dynamic';
import { FileCode } from 'lucide-react';

export default function OfficialComponentsPage() {
  const [selectedComponent, setSelectedComponent] = useState(componentList[0]?.id || '');

  // Dynamically import the selected component with fallback
  const ComponentDisplay = selectedComponent 
    ? dynamic(() => import(`./component-displays/${selectedComponent}`).catch(() => {
        // Fallback to placeholder if component display doesn't exist
        return import('./component-displays/placeholder');
      }), {
        loading: () => <div className="flex items-center justify-center h-full">Loading component...</div>,
        ssr: false
      }) 
    : null;

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-6rem)]">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Official Components</h1>
      <div className="grid grid-cols-5 gap-6 h-[calc(100vh-12rem)]">
        {/* Component List */}
        <Card className="col-span-1 h-full border border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <div className="py-2">
                {componentList.map((component) => (
                  <Button
                    key={component.id}
                    variant={selectedComponent === component.id ? "default" : "ghost"}
                    className="w-full justify-start text-left font-normal mb-1 text-gray-800 dark:text-gray-200"
                    onClick={() => setSelectedComponent(component.id)}
                  >
                    {component.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Component Display */}
        <Card className="col-span-4 h-full border border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6 h-full">
            {selectedComponent ? (
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
                    {componentList.find(c => c.id === selectedComponent)?.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Path: {componentList.find(c => c.id === selectedComponent)?.path}
                  </p>
                  <Separator className="my-4 bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="flex-1 overflow-auto">
                  {ComponentDisplay && <ComponentDisplay component={componentList.find(c => c.id === selectedComponent)} />}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400">
                Select a component from the list to view
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
