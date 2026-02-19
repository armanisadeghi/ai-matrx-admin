import { Suspense, lazy } from 'react';
import { InitWizardSkeleton } from '@/features/research/components/shared/Skeletons';

const ResearchInitForm = lazy(() => import('@/features/research/components/init/ResearchInitForm'));

export default function ResearchNewTopicPage() {
    return (
        <div className="h-full w-full overflow-y-auto bg-textured">
            <Suspense fallback={<InitWizardSkeleton />}>
                <ResearchInitForm />
            </Suspense>
        </div>
    );
}
