import { Suspense, lazy } from 'react';
import { SourceDetailSkeleton } from '@/features/research/components/shared/Skeletons';

const SourceDetail = lazy(() => import('@/features/research/components/sources/SourceDetail'));

export default async function SourceDetailPage({
    params,
}: {
    params: Promise<{ projectId: string; sourceId: string }>;
}) {
    const { projectId, sourceId } = await params;

    return (
        <Suspense fallback={<SourceDetailSkeleton />}>
            <SourceDetail projectId={projectId} sourceId={sourceId} />
        </Suspense>
    );
}
