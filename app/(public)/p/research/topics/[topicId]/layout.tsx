import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTopicServer, getTopicOverviewServer } from '@/features/research/service/server';
import ResearchTopicShell from './ResearchTopicShell';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ topicId: string }>;
}): Promise<Metadata> {
    const { topicId } = await params;
    if (!UUID_RE.test(topicId)) return { title: 'Topic Not Found' };

    const topic = await getTopicServer(topicId);
    if (!topic) return { title: 'Topic Not Found' };

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

    const [topic, overview] = await Promise.all([
        getTopicServer(topicId),
        getTopicOverviewServer(topicId),
    ]);

    if (!topic) {
        notFound();
    }

    return (
        <div className="h-full w-full bg-textured">
            <ResearchTopicShell
                topicId={topicId}
                initialData={{ topic, progress: overview }}
            >
                {children}
            </ResearchTopicShell>
        </div>
    );
}
