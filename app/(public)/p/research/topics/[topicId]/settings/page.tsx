import { Suspense, lazy } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';

const TopicSettingsPage = lazy(() => import('@/features/research/components/settings/TopicSettingsPage'));

export default function SettingsPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <TopicSettingsPage />
        </Suspense>
    );
}
