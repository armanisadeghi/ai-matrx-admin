import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ResearchLanding = lazy(() => import('@/features/research/components/landing/ResearchLanding'));

export default function ResearchPage() {
    return (
        <div className="h-full w-full overflow-y-auto bg-textured">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-4">
                    <Skeleton className="h-12 w-64" />
                    <Skeleton className="h-6 w-96" />
                </div>
            }>
                <ResearchLanding />
            </Suspense>
        </div>
    );
}
