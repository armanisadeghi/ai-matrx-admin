import { Suspense } from 'react';
import { OverviewSkeleton } from '@/features/research/components/shared/Skeletons';
import ResearchOverview from '@/features/research/components/overview/ResearchOverview';

export default function TopicOverviewPage() {
    return (
        <Suspense fallback={<OverviewSkeleton />}>
            <ResearchOverview />
        </Suspense>
    );
}
