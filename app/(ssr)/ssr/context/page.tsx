'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContextDashboard } from '@/features/context/components/ContextDashboard';
import { ContextItemList } from '@/features/context/components/ContextItemList';
import { useContextScope } from '@/features/context/hooks/useContextScope';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContextPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ContextPageContent />
    </Suspense>
  );
}

function ContextPageContent() {
  const { scope } = useContextScope();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold">Context Management</h1>
      </div>

      <Tabs value={tab} className="space-y-4">
        <TabsList className="h-8">
          <TabsTrigger value="dashboard" className="text-xs h-7" asChild>
            <a href="?tab=dashboard">Dashboard</a>
          </TabsTrigger>
          <TabsTrigger value="items" className="text-xs h-7" asChild>
            <a href="?tab=items">Items</a>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ContextDashboard scope={scope} />
        </TabsContent>

        <TabsContent value="items">
          <ContextItemList scope={scope} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
