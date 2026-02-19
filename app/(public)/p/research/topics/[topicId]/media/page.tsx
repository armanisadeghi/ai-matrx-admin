import { Suspense, lazy } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';

const MediaGallery = lazy(() => import('@/features/research/components/media/MediaGallery'));

export default function MediaPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <MediaGallery />
        </Suspense>
    );
}
