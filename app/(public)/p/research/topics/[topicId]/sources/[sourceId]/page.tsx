import { Suspense } from 'react';
import { SourceDetailSkeleton } from '@/features/research/components/shared/Skeletons';
import SourceDetail from '@/features/research/components/sources/SourceDetail';

export default async function SourceDetailPage({
    params,
}: {
    params: Promise<{ topicId: string; sourceId: string }>;
}) {
    const { topicId, sourceId } = await params;

    return (
        <Suspense fallback={<SourceDetailSkeleton />}>
            <SourceDetail topicId={topicId} sourceId={sourceId} />
        </Suspense>
    );
}
