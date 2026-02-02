'use client';

import React from 'react';
import { Puzzle } from 'lucide-react';
import { OrgResourceLayout } from '../OrgResourceLayout';
import { Card } from '@/components/ui/card';

/**
 * Organization Shared Projects Page
 * Route: /org/[slug]/projects
 */
export default function OrgProjectsPage() {
  return (
    <OrgResourceLayout 
      resourceName="Projects" 
      icon={<Puzzle className="h-4 w-4" />}
    >
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Puzzle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Shared Projects</h2>
          <p className="text-muted-foreground mb-6">
            Collaborate on projects shared with your organization
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
            <span className="text-sm font-medium">Coming Soon</span>
          </div>
        </div>
      </Card>
    </OrgResourceLayout>
  );
}
