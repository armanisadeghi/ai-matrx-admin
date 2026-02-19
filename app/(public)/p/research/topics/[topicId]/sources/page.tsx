import { Suspense, lazy } from 'react';
import { SourceListSkeleton } from '@/features/research/components/shared/Skeletons';

const SourceList = lazy(() => import('@/features/research/components/sources/SourceList'));

export default function SourcesPage() {
    return (
        <Suspense fallback={<SourceListSkeleton />}>
            <SourceList />
        </Suspense>
    );
}
