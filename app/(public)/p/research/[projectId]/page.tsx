import { Suspense, lazy } from 'react';
import { OverviewSkeleton } from '@/features/research/components/shared/Skeletons';

const ResearchOverview = lazy(() => import('@/features/research/components/overview/ResearchOverview'));

export default function ResearchOverviewPage() {
    return (
        <Suspense fallback={<OverviewSkeleton />}>
            <ResearchOverview />
        </Suspense>
    );
}
