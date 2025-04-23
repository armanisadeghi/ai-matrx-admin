'use client';

import React from 'react';
import { ComponentEntry } from '../component-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileCode } from 'lucide-react';

interface PlaceholderProps {
  component?: ComponentEntry;
}

export default function PlaceholderDisplay({ component }: PlaceholderProps) {
  if (!component) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 dark:text-gray-400">
        Component not found
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <FileCode className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="ml-2 text-yellow-800 dark:text-yellow-200">Component Display Coming Soon</AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          The detailed display for this component is currently being developed. 
          Check back soon for a complete usage guide and examples.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Component Information</h3>
        <div className="space-y-2">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Name: </span>
            <span className="text-gray-800 dark:text-gray-200">{component.name}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Path: </span>
            <span className="text-gray-800 dark:text-gray-200">{component.path}</span>
          </div>
          {component.description && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Description: </span>
              <span className="text-gray-800 dark:text-gray-200">{component.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Usage Instructions</h3>
        <p className="text-gray-700 dark:text-gray-300">
          This component can be imported from its path and used in your application.
          For detailed usage examples, please refer to the component source file or check back
          later when this display is fully implemented.
        </p>
        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md">
          <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
{`import { ${component.name.replace(/\s/g, '')} } from '@/${component.path.replace(/\.tsx?$/, '')}';

// Basic usage example
<${component.name.replace(/\s/g, '')} />
`}
          </pre>
        </div>
      </div>
    </div>
  );
} 