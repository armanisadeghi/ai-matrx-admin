'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

interface VisualsEditTabProps {
  primaryColor?: string;
  accentColor?: string;
  appletIcon?: string;
  imageUrl?: string;
  name?: string;
  onUpdate: (field: string, value: string) => void;
}

export default function VisualsEditTab({
  primaryColor,
  accentColor,
  appletIcon,
  imageUrl,
  name,
  onUpdate
}: VisualsEditTabProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex items-center space-x-2">
              <Input 
                id="primary-color"
                type="text" 
                value={primaryColor || ''} 
                onChange={(e) => onUpdate('primaryColor', e.target.value)}
                placeholder="#000000"
              />
              {primaryColor && (
                <div 
                  className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700" 
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="accent-color">Accent Color</Label>
            <div className="flex items-center space-x-2">
              <Input 
                id="accent-color"
                type="text" 
                value={accentColor || ''} 
                onChange={(e) => onUpdate('accentColor', e.target.value)}
                placeholder="#000000"
              />
              {accentColor && (
                <div 
                  className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700" 
                  style={{ backgroundColor: accentColor }}
                />
              )}
            </div>
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
              className="mb-2"
            />
            {imageUrl && (
              <div className="relative w-full h-48 rounded-md overflow-hidden mt-2">
                <Image
                  src={imageUrl}
                  alt={name || 'Applet preview'}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
} 