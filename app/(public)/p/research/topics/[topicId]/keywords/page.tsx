import { Suspense, lazy } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';

const KeywordManager = lazy(() => import('@/features/research/components/keywords/KeywordManager'));

export default function KeywordsPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <KeywordManager />
        </Suspense>
    );
}
