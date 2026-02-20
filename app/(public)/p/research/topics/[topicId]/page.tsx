import { Suspense } from 'react';
import { OverviewSkeleton } from '@/features/research/components/shared/Skeletons';
import ResearchOverview from '@/features/research/components/overview/ResearchOverview';
import { createClient } from '@/utils/supabase/server';

async function TopicJsonLd({ topicId }: { topicId: string }) {
    const supabase = await createClient();
    const { data: topic } = await supabase
        .from('rs_topic')
        .select('name, description, created_at, updated_at')
        .eq('id', topicId)
        .single();

    if (!topic) return null;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ResearchProject',
        name: topic.name,
        description: topic.description || `Research topic: ${topic.name}`,
        dateCreated: topic.created_at,
        dateModified: topic.updated_at || topic.created_at,
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

export default async function TopicOverviewPage({
    params,
}: {
    params: Promise<{ topicId: string }>;
}) {
    const { topicId } = await params;

    return (
        <>
            <Suspense>
                <TopicJsonLd topicId={topicId} />
            </Suspense>
            <Suspense fallback={<OverviewSkeleton />}>
                <ResearchOverview />
            </Suspense>
        </>
    );
}
