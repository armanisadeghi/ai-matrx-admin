'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

interface VisualsTabProps {
  primaryColor?: string;
  accentColor?: string;
  appletIcon?: string;
  imageUrl?: string;
  name?: string;
}

export default function VisualsTab({
  primaryColor,
  accentColor,
  appletIcon,
  imageUrl,
  name
}: VisualsTabProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex space-x-4">
              {primaryColor && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Primary Color</p>
                  <div 
                    className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 mt-1"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">{primaryColor}</p>
                </div>
              )}
              
              {accentColor && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Accent Color</p>
                  <div 
                    className="w-8 h-8 rounded border border-gray-200 dark:border-gray-700 mt-1"
                    style={{ backgroundColor: accentColor }}
                  />
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">{accentColor}</p>
                </div>
              )}
            </div>

            {appletIcon && (
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Icon</p>
                <p className="text-gray-900 dark:text-gray-100">{appletIcon}</p>
              </div>
            )}
          </div>
          
          {imageUrl && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Preview Image</p>
              <div className="relative w-full h-48 rounded-md overflow-hidden mt-2">
                <Image
                  src={imageUrl}
                  alt={name || 'Applet preview'}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 