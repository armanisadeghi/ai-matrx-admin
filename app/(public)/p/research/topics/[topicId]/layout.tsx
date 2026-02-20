import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/utils/supabase/server';
import ResearchTopicShell from './ResearchTopicShell';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getTopicMetadata(topicId: string) {
    if (!UUID_RE.test(topicId)) return null;
    const supabase = await createClient();
    const { data } = await supabase
        .from('rs_topic')
        .select('name, description')
        .eq('id', topicId)
        .single();
    return data;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ topicId: string }>;
}): Promise<Metadata> {
    const { topicId } = await params;
    const topic = await getTopicMetadata(topicId);

    if (!topic) {
        return { title: 'Topic Not Found' };
    }

    const title = topic.name;
    const description = topic.description || `Research topic: ${topic.name}`;

    return {
        title,
        description,
        alternates: { canonical: `/p/research/topics/${topicId}` },
        openGraph: {
            title: `${title} | AI Matrx Research`,
            description,
        },
        twitter: {
            card: 'summary',
            title: `${title} | AI Matrx Research`,
            description,
        },
    };
}

export default async function ResearchTopicLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ topicId: string }>;
}) {
    const { topicId } = await params;

    if (!UUID_RE.test(topicId)) {
        notFound();
    }

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
