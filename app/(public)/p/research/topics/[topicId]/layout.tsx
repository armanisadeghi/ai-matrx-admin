import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ResearchTopicShell from './ResearchTopicShell';

export default async function ResearchTopicLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ topicId: string }>;
}) {
    const { topicId } = await params;

    return (
        <div className="h-full w-full bg-textured">
            <Suspense fallback={
                <div className="h-full flex">
                    <div className="hidden md:block w-48 border-r border-border bg-card/50">
                        <div className="p-3 space-y-2">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <Skeleton key={i} className="h-9 rounded-lg" />
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 p-6">
                        <Skeleton className="h-8 w-48 mb-6" />
                        <div className="grid grid-cols-2 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-28 rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            }>
                <ResearchTopicShell topicId={topicId}>
                    {children}
                </ResearchTopicShell>
            </Suspense>
        </div>
    );
}
