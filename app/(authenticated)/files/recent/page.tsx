'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, Construction } from 'lucide-react';

export default function RecentFilesPage() {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Recent Files</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Construction className="h-16 w-16 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="font-semibold">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                The Recent Files feature is currently under development. 
                This will show your recently accessed files for quick access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

