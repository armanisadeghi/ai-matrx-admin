import { Suspense } from 'react';
import { PodcastsContainer } from '@/features/podcasts/components/admin/PodcastsContainer';

export default function PodcastsAdminPage() {
    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>}>
                <PodcastsContainer />
            </Suspense>
        </div>
    );
}
