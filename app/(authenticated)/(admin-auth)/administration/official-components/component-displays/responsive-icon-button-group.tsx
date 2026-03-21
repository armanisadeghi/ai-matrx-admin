'use client';

import React, { useState } from 'react';
import { ComponentEntry } from '../parts/component-list';
import { ComponentDisplayWrapper } from '../component-usage';
import { ResponsiveIconButtonGroup, IconButtonConfig } from '@/components/official/ResponsiveIconButtonGroup';
import { Copy, Edit, Trash2, Download, Share2 } from 'lucide-react';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function ResponsiveIconButtonGroupDisplay({ component }: ComponentDisplayProps) {
  if (!component) return null;
  
  // Example code with all available props and their default values
  const code = `import { ResponsiveIconButtonGroup, IconButtonConfig } from '@/components/official/ResponsiveIconButtonGroup';
import { Copy, Edit, Trash2, Download, Share2 } from 'lucide-react';

const buttons: IconButtonConfig[] = [
  {
    id: 'copy',
    icon: Copy,
    tooltip: 'Copy',
    mobileLabel: 'Copy Item',
    onClick: () => console.log('Copy clicked'),
  },
  {
    id: 'edit',
    icon: Edit,
    tooltip: 'Edit',
    mobileLabel: 'Edit Item',
    onClick: () => console.log('Edit clicked'),
  },
  {
    id: 'download',
    icon: Download,
    tooltip: 'Download',
    mobileLabel: 'Download Item',
    onClick: () => console.log('Download clicked'),
  },
  {
    id: 'share',
    icon: Share2,
    tooltip: 'Share',
    mobileLabel: 'Share Item',
    onClick: () => console.log('Share clicked'),
  },
  {
    id: 'delete',
    icon: Trash2,
    tooltip: 'Delete',
    mobileLabel: 'Delete Item',
    onClick: () => console.log('Delete clicked'),
    iconClassName: 'text-destructive',
  },
];

<ResponsiveIconButtonGroup
  buttons={buttons}
  sheetTitle="Actions"           // Sheet title for mobile menu
  size="sm"                       // Options: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'sm')
  tooltipSide="top"               // Options: 'top' | 'right' | 'bottom' | 'left' (default: 'top')
  forceMobile={false}             // Force mobile mode for testing (default: false)
  className=""                    // Additional classes for the container
/>`;

  const buttons: IconButtonConfig[] = [
    {
      id: 'copy',
      icon: Copy,
      tooltip: 'Copy',
      mobileLabel: 'Copy Item',
      onClick: () => console.log('Copy clicked'),
    },
    {
      id: 'edit',
      icon: Edit,
      tooltip: 'Edit',
      mobileLabel: 'Edit Item',
      onClick: () => console.log('Edit clicked'),
    },
    {
      id: 'download',
      icon: Download,
      tooltip: 'Download',
      mobileLabel: 'Download Item',
      onClick: () => console.log('Download clicked'),
    },
    {
      id: 'share',
      icon: Share2,
      tooltip: 'Share',
      mobileLabel: 'Share Item',
      onClick: () => console.log('Share clicked'),
    },
    {
      id: 'delete',
      icon: Trash2,
      tooltip: 'Delete',
      mobileLabel: 'Delete Item',
      onClick: () => console.log('Delete clicked'),
      iconClassName: 'text-destructive',
    },
  ];

  return (
    <ComponentDisplayWrapper
      component={component}
      code={code}
      description="A responsive button group that automatically adapts between desktop (icon buttons with tooltips) and mobile (iOS-style sheet menu). Perfect for toolbars, headers, and action menus that need to work across all devices."
    >
      <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-muted">
        <span className="text-sm text-muted-foreground">Actions:</span>
        <ResponsiveIconButtonGroup
          buttons={buttons}
          sheetTitle="Actions"
          size="sm"
          tooltipSide="top"
        />
      </div>
      <div className="mt-4 text-xs text-muted-foreground">
        <p>• Desktop (&gt;768px): Shows icon buttons with tooltips</p>
        <p>• Mobile (&lt;768px): Shows "..." button that opens iOS-style sheet menu</p>
        <p>• Supports custom components via `component` or `render` props for advanced use cases</p>
      </div>
    </ComponentDisplayWrapper>
  );
}
