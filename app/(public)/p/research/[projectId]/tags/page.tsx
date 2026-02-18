import { Suspense, lazy } from 'react';
import { TagsSkeleton } from '@/features/research/components/shared/Skeletons';

const TagManager = lazy(() => import('@/features/research/components/tags/TagManager'));

export default function TagsPage() {
    return (
        <Suspense fallback={<TagsSkeleton />}>
            <TagManager />
        </Suspense>
    );
}
