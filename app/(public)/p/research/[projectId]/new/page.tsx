import { Suspense, lazy } from 'react';
import { InitWizardSkeleton } from '@/features/research/components/shared/Skeletons';

const ResearchInitForm = lazy(() => import('@/features/research/components/init/ResearchInitForm'));

export default async function ResearchNewPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await params;

    return (
        <Suspense fallback={<InitWizardSkeleton />}>
            <ResearchInitForm projectId={projectId} />
        </Suspense>
    );
}
