'use client';

import { Suspense } from 'react';
import { ContextTemplateBrowser } from '@/features/context/components/ContextTemplateBrowser';
import { useContextScope } from '@/features/context/hooks/useContextScope';
import { Skeleton } from '@/components/ui/skeleton';

export default function TemplatesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TemplatesContent />
    </Suspense>
  );
}

function TemplatesContent() {
  const { scope } = useContextScope();
  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold">Context Templates</h1>
      <ContextTemplateBrowser scope={scope} />
    </div>
  );
}
