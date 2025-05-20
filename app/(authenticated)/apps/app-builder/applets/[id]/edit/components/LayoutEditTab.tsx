'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LayoutEditTabProps {
  layoutType?: string;
  appletSubmitText?: string;
  overviewLabel?: string;
  onUpdate: (field: string, value: string) => void;
}

export default function LayoutEditTab({
  layoutType,
  appletSubmitText,
  overviewLabel,
  onUpdate
}: LayoutEditTabProps) {
  // Layout type options
  const layoutOptions = [
    { value: "horizontal", label: "Horizontal" },
    { value: "vertical", label: "Vertical" },
    { value: "stepper", label: "Stepper" },
    { value: "flat", label: "Flat" },
    { value: "open", label: "Open" },
    { value: "oneColumn", label: "One Column" },
    { value: "twoColumn", label: "Two Column" },
    { value: "threeColumn", label: "Three Column" },
    { value: "fourColumn", label: "Four Column" },
    { value: "tabs", label: "Tabs" },
    { value: "accordion", label: "Accordion" },
    { value: "minimalist", label: "Minimalist" },
    { value: "floatingCard", label: "Floating Card" },
    { value: "sidebar", label: "Sidebar" },
    { value: "carousel", label: "Carousel" },
    { value: "cardStack", label: "Card Stack" },
    { value: "contextual", label: "Contextual" },
    { value: "chat", label: "Chat" },
    { value: "mapBased", label: "Map Based" },
    { value: "fullWidthSidebar", label: "Full Width Sidebar" },
    { value: "stepper-field", label: "Stepper Field" },
    { value: "flat-accordion", label: "Flat Accordion" }
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="layout-type">Layout Type</Label>
            <Select
              value={layoutType || ''}
              onValueChange={(value) => onUpdate('layoutType', value)}
            >
              <SelectTrigger id="layout-type">
                <SelectValue placeholder="Select a layout type" />
              </SelectTrigger>
              <SelectContent>
                {layoutOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="applet-submit-text">Submit Button Text</Label>
            <Input 
              id="applet-submit-text" 
              value={appletSubmitText || ''} 
              onChange={(e) => onUpdate('appletSubmitText', e.target.value)}
              placeholder="Enter submit button text"
            />
          </div>

          <div>
            <Label htmlFor="overview-label">Overview Label</Label>
            <Input 
              id="overview-label" 
              value={overviewLabel || ''} 
              onChange={(e) => onUpdate('overviewLabel', e.target.value)}
              placeholder="Enter overview label"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This will replace the message for Minimalist Layout as well as show after submission.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
} 