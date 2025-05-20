'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface OverviewTabProps {
  id: string;
  name: string;
  description?: string;
  slug: string;
  creator?: string;
}

export default function OverviewTab({
  id,
  name,
  description,
  slug,
  creator
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
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
        </div>
      </Card>
    </div>
  );
} 