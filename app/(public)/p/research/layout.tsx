import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Research | AI Matrx',
    description: 'AI-powered research pipeline. Gather web content, analyze sources, and generate comprehensive research reports with human-in-the-loop curation.',
    openGraph: {
        title: 'Research | AI Matrx',
        description: 'AI-powered research pipeline for comprehensive topic analysis',
    },
};

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
    return children;
}
