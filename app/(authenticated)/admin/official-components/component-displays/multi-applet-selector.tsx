'use client';

import React from 'react';
import { ComponentEntry } from '../parts/component-list';
import { ComponentDisplayWrapper } from '../component-usage';
import MultiAppletSelectDemo from '@/features/applet/demo/MultiAppletSelectDemo';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function MultiAppletSelectorDemo({ component }: ComponentDisplayProps) {
  if (!component) return null;
  
  // Example code to show how to use the component
  const usageCode = `import MultiAppletSelector from '@/features/applet/builder/components/smart-parts/applets/MultiAppletSelector';
import { CustomAppletConfig } from '@/features/applet/builder/builder.types';

// Set up state for selected applets
const [selectedApplets, setSelectedApplets] = useState<CustomAppletConfig[]>([]);

// Handle selection changes
const handleAppletsChange = (applets: CustomAppletConfig[]) => {
  setSelectedApplets(applets);
};

// Render the component
<MultiAppletSelector
  selectedApplets={selectedApplets}
  onAppletsChange={handleAppletsChange}
  onCreateApplet={() => {
    // Handle new applet creation
    console.log('Creating a new applet');
  }}
  // Optional props below
  buttonLabel="Choose Applets"        // Customize button text
  buttonVariant="outline"             // UI variant: default, outline, secondary, ghost
  emptySelectionText="No applets selected"  // Custom text for empty state
  maxSelections={3}                   // Optional limit on number of selections
/>`;

  return (
    <ComponentDisplayWrapper
      component={component}
      code={usageCode}
      description="A versatile component for selecting and managing multiple applets. Provides various configuration options including limiting selections, customizing button appearance, and handling applet creation."
    >
      <div className="w-full">
        <MultiAppletSelectDemo />
      </div>
    </ComponentDisplayWrapper>
  );
} 