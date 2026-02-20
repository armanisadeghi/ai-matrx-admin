import { Suspense } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';
import KeywordManager from '@/features/research/components/keywords/KeywordManager';

export default function KeywordsPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <KeywordManager />
        </Suspense>
    );
}
