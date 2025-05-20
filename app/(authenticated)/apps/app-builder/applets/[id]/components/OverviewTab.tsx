'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

interface OverviewTabProps {
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
}

export default function OverviewTab({
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
  overviewLabel
}: OverviewTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column: Details */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Applet Details</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ID</p>
                <p className="text-gray-900 dark:text-gray-100">{id}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-gray-100">{name || 'Untitled Applet'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</p>
                <p className="text-gray-900 dark:text-gray-100">{slug || 'No slug set'}</p>
              </div>
              
              {creator && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created by</p>
                  <p className="text-gray-900 dark:text-gray-100">{creator}</p>
                </div>
              )}
              
              {description && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</p>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{description}</p>
                </div>
              )}
              
              <div className="flex space-x-4">
                {primaryColor && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Primary Color</p>
                    <div 
                      className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 mt-1"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                )}
                
                {accentColor && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Accent Color</p>
                    <div 
                      className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 mt-1"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Layout Settings</h3>
            
            <div className="space-y-4">
              {layoutType && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Layout Type</p>
                  <p className="text-gray-900 dark:text-gray-100">{layoutType}</p>
                </div>
              )}

              {appletSubmitText && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Submit Button Text</p>
                  <p className="text-gray-900 dark:text-gray-100">{appletSubmitText}</p>
                </div>
              )}

              {overviewLabel && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overview Label</p>
                  <p className="text-gray-900 dark:text-gray-100">{overviewLabel}</p>
                </div>
              )}

              {appletIcon && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Icon</p>
                  <p className="text-gray-900 dark:text-gray-100">{appletIcon}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        {/* Right column: Image and other visual elements */}
        <div className="space-y-6">
          {imageUrl && (
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Preview Image</h3>
              <div className="relative w-full h-48 rounded-md overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={name || 'Applet preview'}
                  fill
                  className="object-cover"
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 