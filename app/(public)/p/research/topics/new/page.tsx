import { Suspense } from 'react';
import { InitWizardSkeleton } from '@/features/research/components/shared/Skeletons';
import ResearchInitForm from '@/features/research/components/init/ResearchInitForm';

export default function ResearchNewTopicPage() {
    return (
        <div className="h-full w-full overflow-y-auto bg-textured">
            <Suspense fallback={<InitWizardSkeleton />}>
                <ResearchInitForm />
            </Suspense>
        </div>
    );
}
