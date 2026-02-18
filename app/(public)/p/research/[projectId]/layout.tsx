import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ResearchProjectShell = lazy(() => import('./ResearchProjectShell'));

export default async function ResearchProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await params;

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
                <ResearchProjectShell projectId={projectId}>
                    {children}
                </ResearchProjectShell>
            </Suspense>
        </div>
    );
}
