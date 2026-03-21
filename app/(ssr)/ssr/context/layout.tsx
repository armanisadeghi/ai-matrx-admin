'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { ContextScopeBar } from '@/features/context/components/ContextScopeBar';
import { useContextScope } from '@/features/context/hooks/useContextScope';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContextLayout({ children }: { children: React.ReactNode }) {
  const { scope, setScope } = useContextScope();
  const pathname = usePathname();

  return (
    <div
      className="h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden"
      style={{ '--header-height': 'var(--shell-header-h)', paddingTop: 'var(--shell-header-h)' } as React.CSSProperties}
    >
      {/* Scope bar */}
      <div className="shrink-0 border-b border-border/50 px-4 py-2 bg-card/50">
        <Suspense fallback={<Skeleton className="h-7 w-48" />}>
          <ContextScopeBar scope={scope} onScopeChange={setScope} />
        </Suspense>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 max-w-[1600px]">
          <Suspense fallback={<ContextPageSkeleton />}>
            {children}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function ContextPageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
