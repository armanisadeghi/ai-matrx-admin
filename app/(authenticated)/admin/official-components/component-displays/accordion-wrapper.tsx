'use client';

import React from 'react';
import AccordionWrapper from '@/components/matrx/matrx-collapsible/AccordionWrapper';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Info, Settings } from 'lucide-react';
import { ComponentEntry } from '../component-list';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function AccordionWrapperDisplay({ component }: ComponentDisplayProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Basic Usage</h3>
        <AccordionWrapper 
          title="Basic Accordion" 
          value="basic-accordion"
          defaultOpen={true}
        >
          <p className="text-gray-700 dark:text-gray-300">
            This is a basic accordion wrapper component that provides a collapsible section.
            Click the header to toggle the content visibility.
          </p>
        </AccordionWrapper>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">With Right Element</h3>
        <AccordionWrapper 
          title="Accordion with Action Button" 
          value="right-element-accordion"
          rightElement={
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          }
        >
          <p className="text-gray-700 dark:text-gray-300">
            This accordion includes a button in the right side of the header.
            The right element can be any React node, making it flexible for different use cases.
          </p>
        </AccordionWrapper>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Custom Styling</h3>
        <AccordionWrapper 
          title="Custom Styled Accordion" 
          value="styled-accordion"
          className="border border-blue-200 dark:border-blue-800 rounded-md"
        >
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
            <p className="text-gray-700 dark:text-gray-300">
              This accordion has custom styling applied through the className prop.
              You can customize the appearance to match your application's design.
            </p>
          </div>
        </AccordionWrapper>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Complex Content</h3>
        <AccordionWrapper 
          title="Accordion with Complex Content" 
          value="complex-accordion"
          rightElement={
            <div className="flex items-center">
              <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mr-2" />
              <span className="text-sm text-blue-500 dark:text-blue-400">Info</span>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Accordions can contain complex content structures:
            </p>
            <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md">
              <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Nested Content</h4>
              <p className="text-gray-700 dark:text-gray-300">This is some nested content in a card-like container.</p>
            </div>
            <Separator className="my-2 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex justify-end">
              <Button size="sm">Save Changes</Button>
            </div>
          </div>
        </AccordionWrapper>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Multiple Accordions</h3>
        <div className="space-y-2">
          <AccordionWrapper 
            title="Section 1" 
            value="section-1"
          >
            <p className="text-gray-700 dark:text-gray-300">Content for section 1</p>
          </AccordionWrapper>
          
          <AccordionWrapper 
            title="Section 2" 
            value="section-2"
          >
            <p className="text-gray-700 dark:text-gray-300">Content for section 2</p>
          </AccordionWrapper>
          
          <AccordionWrapper 
            title="Section 3" 
            value="section-3"
          >
            <p className="text-gray-700 dark:text-gray-300">Content for section 3</p>
          </AccordionWrapper>
        </div>
      </div>

      <div className="space-y-2 mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Props Reference</h3>
        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md">
          <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
{`
interface AccordionWrapperProps {
  title: string;             // The title displayed in the accordion header
  value: string;             // Unique identifier for the accordion
  rightElement?: ReactNode;  // Optional element to display on the right side of the header
  defaultOpen?: boolean;     // Whether the accordion is open by default (false if not specified)
  className?: string;        // Optional additional CSS classes
  children: ReactNode;       // Content to display inside the accordion
}
`}
          </pre>
        </div>
      </div>
    </div>
  );
} 