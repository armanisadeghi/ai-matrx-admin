import { Suspense } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';
import ContentList from '@/features/research/components/content/ContentList';

export default function ContentPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <ContentList />
        </Suspense>
    );
}
