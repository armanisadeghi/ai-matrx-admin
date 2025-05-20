'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';

interface OverviewEditTabProps {
  id: string;
  name: string;
  description?: string;
  slug: string;
  creator?: string;
  imageUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  appletIcon?: string;
  appletSubmitText?: string;
  layoutType?: string;
  overviewLabel?: string;
  onUpdate: (field: string, value: string) => void;
}

export default function OverviewEditTab({
  id,
  name,
  description,
  slug,
  creator,
  imageUrl,
  primaryColor,
  accentColor,
  appletIcon,
  appletSubmitText,
  layoutType,
  overviewLabel,
  onUpdate
}: OverviewEditTabProps) {
  // For now, we'll simulate the color picker with an input
  // In a real implementation, you'd use a proper color picker component
  const ColorPickerSimulation = ({ value, onChange, label }: { value?: string, onChange: (value: string) => void, label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center space-x-2">
        <Input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
        {value && (
          <div 
            className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700" 
            style={{ backgroundColor: value }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column: Basic Details */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Basic Details</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="applet-id">ID (read-only)</Label>
                <Input id="applet-id" value={id} disabled />
              </div>

              <div>
                <Label htmlFor="applet-name">Name</Label>
                <Input 
                  id="applet-name" 
                  value={name} 
                  onChange={(e) => onUpdate('name', e.target.value)}
                  placeholder="Enter applet name"
                />
              </div>
              
              <div>
                <Label htmlFor="applet-slug">Slug</Label>
                <Input 
                  id="applet-slug" 
                  value={slug} 
                  onChange={(e) => onUpdate('slug', e.target.value)}
                  placeholder="Enter slug"
                />
              </div>
              
              <div>
                <Label htmlFor="applet-creator">Created by</Label>
                <Input 
                  id="applet-creator" 
                  value={creator || ''} 
                  onChange={(e) => onUpdate('creator', e.target.value)}
                  placeholder="Enter creator name"
                />
              </div>
              
              <div>
                <Label htmlFor="applet-description">Description</Label>
                <Textarea 
                  id="applet-description" 
                  value={description || ''} 
                  onChange={(e) => onUpdate('description', e.target.value)}
                  placeholder="Enter description"
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPickerSimulation 
                  value={primaryColor} 
                  onChange={(value) => onUpdate('primaryColor', value)}
                  label="Primary Color"
                />
                
                <ColorPickerSimulation 
                  value={accentColor} 
                  onChange={(value) => onUpdate('accentColor', value)}
                  label="Accent Color"
                />
              </div>
            </div>
          </Card>
        </div>
        
        {/* Right column: Layout Settings */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Layout Settings</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="layout-type">Layout Type</Label>
                <Input 
                  id="layout-type" 
                  value={layoutType || ''} 
                  onChange={(e) => onUpdate('layoutType', e.target.value)}
                  placeholder="Enter layout type"
                />
                {/* This would typically be a dropdown/select in a real implementation */}
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
              </div>

              <div>
                <Label htmlFor="applet-icon">Icon</Label>
                <Input 
                  id="applet-icon" 
                  value={appletIcon || ''} 
                  onChange={(e) => onUpdate('appletIcon', e.target.value)}
                  placeholder="Enter icon name"
                />
              </div>

              <div>
                <Label htmlFor="image-url">Preview Image URL</Label>
                <Input 
                  id="image-url" 
                  value={imageUrl || ''} 
                  onChange={(e) => onUpdate('imageUrl', e.target.value)}
                  placeholder="Enter image URL"
                />
                {/* This would typically include an image upload component in a real implementation */}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 