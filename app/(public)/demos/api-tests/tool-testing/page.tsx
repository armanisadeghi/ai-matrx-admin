// app/(public)/demos/api-tests/tool-testing/page.tsx
// Server Component shell — renders instantly.
// Client test UI lazy-loads after hydration.

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const ToolTestingClient = lazy(() => import('./ToolTestingClient'));

export default function ToolTestingPage() {
    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            }>
                <ToolTestingClient />
            </Suspense>
        </div>
    );
}
