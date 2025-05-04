'use client';

import React from 'react';
import { ComponentEntry } from '../parts/component-list';
import { ComponentDisplayWrapper } from '../component-usage';
import StructuredSectionCard from '@/components/official/StructuredSectionCard';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Plus, 
  Settings
} from 'lucide-react';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function StructuredSectionCardDisplay({ component }: ComponentDisplayProps) {
  if (!component) return null;
  
  // Example code with all available props and their default values
  const code = `import StructuredSectionCard from '@/components/official/StructuredSectionCard';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';

<StructuredSectionCard
  title="Section Title"                  // Required: Title displayed at the top of the card
  description="Optional description"     // Optional: Additional description text under the title
  headerActions={[                       // Optional: Array of React elements for header actions
    <Button key="settings" size="sm" variant="outline">
      <Settings className="h-4 w-4 mr-2" />
      Settings
    </Button>,
    <Button key="new" size="sm" variant="default">
      <Plus className="h-4 w-4 mr-2" />
      New Item
    </Button>
  ]}
  footerLeft={                           // Optional: React element for left footer content
    <Button variant="outline" size="sm">Cancel</Button>
  }
  footerCenter={                         // Optional: React element for center footer content
    <div className="text-sm text-gray-500 dark:text-gray-400">
      Additional information
    </div>
  }
  footerRight={                          // Optional: React element for right footer content
    <Button size="sm">
      Continue
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  }
  className=""                           // Optional: Additional CSS classes for the card
>
  {/* Main content of the section */}
  <div className="py-6">
    Your content goes here
  </div>
</StructuredSectionCard>`;

  return (
    <ComponentDisplayWrapper
      component={component}
      code={code}
      description="A structured card layout with title, description, optional header actions, and a three-column footer. Perfect for form sections, settings panels, or any content that needs clear organization."
    >
      <div className="w-full max-w-xl">
        <StructuredSectionCard
          title="Project Settings"
          description="Configure your project properties and options"
          headerActions={[
            <Button key="settings" size="sm" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>,
            <Button key="new" size="sm" variant="default">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          ]}
          footerLeft={
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          }
          footerCenter={
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: Today
            </div>
          }
          footerRight={
            <Button size="sm">
              Save Changes
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          }
        >
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Form content would go here
          </div>
        </StructuredSectionCard>
      </div>
    </ComponentDisplayWrapper>
  );
} 