import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const ToolsDemoClient = lazy(() => import('./ToolsDemoClient'));

export default function ToolsDemoPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ToolsDemoClient />
      </Suspense>
    </div>
  );
}
