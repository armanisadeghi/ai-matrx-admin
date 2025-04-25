'use client';

import React from 'react';
import { ComponentEntry } from '../component-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileCode } from 'lucide-react';
import { ComponentDisplayWrapper } from '../component-usage';

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

  const componentName = component.name.replace(/\s/g, '');
  const importPath = `@/${component.path.replace(/\.tsx?$/, '')}`;

  const code = `import { ${componentName} } from '${importPath}';

// Basic usage example
<${componentName} 
  // Props would be shown here with their default values
/>`;

  return (
    <ComponentDisplayWrapper
      component={component}
      code={code}
      description="This component doesn't have a display implementation yet. You can help by creating one!"
      className="h-[200px]"
    >
      <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <FileCode className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="ml-2 text-yellow-800 dark:text-yellow-200">Component Display Not Implemented</AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          The display for this component is currently missing.
          See the source code at {component.path} for usage details.
        </AlertDescription>
      </Alert>
    </ComponentDisplayWrapper>
  );
} 