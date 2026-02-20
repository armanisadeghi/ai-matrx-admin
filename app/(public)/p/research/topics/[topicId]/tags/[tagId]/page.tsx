import { Suspense } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';
import ConsolidationView from '@/features/research/components/consolidation/ConsolidationView';

export default async function TagConsolidationPage({
    params,
}: {
    params: Promise<{ topicId: string; tagId: string }>;
}) {
    const { topicId, tagId } = await params;

    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <ConsolidationView topicId={topicId} tagId={tagId} />
        </Suspense>
    );
}
