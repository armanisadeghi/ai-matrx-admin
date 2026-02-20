import { Suspense } from 'react';
import { SourceListSkeleton } from '@/features/research/components/shared/Skeletons';
import SourceList from '@/features/research/components/sources/SourceList';

export default function SourcesPage() {
    return (
        <Suspense fallback={<SourceListSkeleton />}>
            <SourceList />
        </Suspense>
    );
}
