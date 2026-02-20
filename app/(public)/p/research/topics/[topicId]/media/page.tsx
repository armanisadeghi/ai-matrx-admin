import { Suspense } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';
import MediaGallery from '@/features/research/components/media/MediaGallery';

export default function MediaPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <MediaGallery />
        </Suspense>
    );
}
