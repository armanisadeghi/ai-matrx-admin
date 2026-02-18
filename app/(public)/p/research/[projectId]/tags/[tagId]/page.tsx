import { Suspense, lazy } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';

const ConsolidationView = lazy(() => import('@/features/research/components/consolidation/ConsolidationView'));

export default async function TagConsolidationPage({
    params,
}: {
    params: Promise<{ projectId: string; tagId: string }>;
}) {
    const { projectId, tagId } = await params;

    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <ConsolidationView projectId={projectId} tagId={tagId} />
        </Suspense>
    );
}
