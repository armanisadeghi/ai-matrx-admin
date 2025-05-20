'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface LayoutTabProps {
  layoutType?: string;
  appletSubmitText?: string;
  overviewLabel?: string;
}

export default function LayoutTab({
  layoutType,
  appletSubmitText,
  overviewLabel
}: LayoutTabProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
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
        </div>
      </Card>
    </div>
  );
} 