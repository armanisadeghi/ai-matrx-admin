import { Suspense, lazy } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';

const ContentList = lazy(() => import('@/features/research/components/content/ContentList'));

export default function ContentPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <ContentList />
        </Suspense>
    );
}
