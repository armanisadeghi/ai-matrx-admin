import { Suspense } from 'react';
import { GenericPageSkeleton } from '@/features/research/components/shared/Skeletons';
import TopicSettingsPage from '@/features/research/components/settings/TopicSettingsPage';

export default function SettingsPage() {
    return (
        <Suspense fallback={<GenericPageSkeleton />}>
            <TopicSettingsPage />
        </Suspense>
    );
}
