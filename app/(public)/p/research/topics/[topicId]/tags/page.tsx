import { Suspense } from 'react';
import { TagsSkeleton } from '@/features/research/components/shared/Skeletons';
import TagManager from '@/features/research/components/tags/TagManager';

export default function TagsPage() {
    return (
        <Suspense fallback={<TagsSkeleton />}>
            <TagManager />
        </Suspense>
    );
}
