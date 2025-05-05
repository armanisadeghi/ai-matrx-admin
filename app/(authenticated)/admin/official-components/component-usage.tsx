// File: app/(authenticated)/admin/official-components/component-usage.tsx

import React from 'react';
import { ComponentEntry } from './parts/component-list';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ComponentDisplayWrapperProps {
  component: ComponentEntry;
  children: React.ReactNode;
  className?: string;
  description?: string;
  code: string;
}

/**
 * Standard wrapper for all component displays
 * This ensures consistent presentation across all component examples
 */
export const ComponentDisplayWrapper: React.FC<ComponentDisplayWrapperProps> = ({
  component,
  children,
  className,
  description,
  code,
}) => {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="text-gray-700 dark:text-gray-300 text-sm">
        {description || component.description || 'No description available'}
      </div>
      
      {/* Component Display */}
      <Card className={cn("p-6 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800", className)}>
        <div className="w-full flex items-center justify-center">
          {children}
        </div>
      </Card>
      
      {/* Code Example */}
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-md p-4 overflow-x-auto">
        <pre className="text-xs text-gray-800 dark:text-gray-200">
          {code}
        </pre>
      </div>
    </div>
  );
};

// Individual components with an actual usage and all props included.