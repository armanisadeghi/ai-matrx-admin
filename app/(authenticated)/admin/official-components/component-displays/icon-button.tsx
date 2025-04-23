'use client';

import React from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { Search, Heart, Plus, Trash, Settings, Info } from 'lucide-react';
import { ComponentEntry } from '../component-list';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function IconButtonDisplay({ component }: ComponentDisplayProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Variants</h3>
        <div className="flex flex-wrap gap-4">
          <IconButton 
            variant="default" 
            icon={<Search className="h-4 w-4" />} 
            tooltip="Default variant"
          />
          <IconButton 
            variant="destructive" 
            icon={<Trash className="h-4 w-4" />} 
            tooltip="Destructive variant"
          />
          <IconButton 
            variant="outline" 
            icon={<Plus className="h-4 w-4" />} 
            tooltip="Outline variant"
          />
          <IconButton 
            variant="secondary" 
            icon={<Heart className="h-4 w-4" />} 
            tooltip="Secondary variant"
          />
          <IconButton 
            variant="ghost" 
            icon={<Settings className="h-4 w-4" />} 
            tooltip="Ghost variant"
          />
          <IconButton 
            variant="link" 
            icon={<Info className="h-4 w-4" />} 
            tooltip="Link variant"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Sizes</h3>
        <div className="flex flex-wrap gap-4 items-center">
          <IconButton 
            size="sm" 
            icon={<Search className="h-3.5 w-3.5" />} 
            tooltip="Small size"
          />
          <IconButton 
            size="default" 
            icon={<Search className="h-4 w-4" />} 
            tooltip="Default size"
          />
          <IconButton 
            size="lg" 
            icon={<Search className="h-5 w-5" />} 
            tooltip="Large size"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Disabled States</h3>
        <div className="flex flex-wrap gap-4">
          <IconButton 
            variant="default" 
            icon={<Search className="h-4 w-4" />} 
            tooltip="Disabled with tooltip"
            disabled={true}
            showTooltipOnDisabled={true}
          />
          <IconButton 
            variant="destructive" 
            icon={<Trash className="h-4 w-4" />} 
            tooltip="Regular tooltip"
            disabledTooltip="Custom disabled tooltip"
            disabled={true}
            showTooltipOnDisabled={true}
          />
          <IconButton 
            variant="outline" 
            icon={<Plus className="h-4 w-4" />} 
            tooltip="No tooltip when disabled"
            disabled={true}
            showTooltipOnDisabled={false}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Usage Example</h3>
        <div className="flex flex-wrap gap-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-md">
          <IconButton 
            variant="ghost" 
            icon={<Search className="h-4 w-4" />} 
            tooltip="Search"
          />
          <IconButton 
            variant="ghost" 
            icon={<Plus className="h-4 w-4" />} 
            tooltip="Add new"
          />
          <IconButton 
            variant="ghost" 
            icon={<Settings className="h-4 w-4" />} 
            tooltip="Settings"
          />
          <IconButton 
            variant="destructive" 
            icon={<Trash className="h-4 w-4" />} 
            tooltip="Delete"
          />
        </div>
      </div>

      <div className="space-y-2 mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Props Reference</h3>
        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md">
          <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
{`
interface IconButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  tooltip?: string;
  icon: React.ReactNode;
  showTooltipOnDisabled?: boolean;
  disabledTooltip?: string;
  // plus all standard button props
}
`}
          </pre>
        </div>
      </div>
    </div>
  );
} 