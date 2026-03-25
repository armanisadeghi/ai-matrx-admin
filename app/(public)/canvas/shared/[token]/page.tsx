import React from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { siteConfig } from '@/config/extras/site';
import { getCanvasBlockMeta, buildCanvasDescription } from '@/features/canvas/canvas-block-meta';
import { SharedCanvasViewClient } from './SharedCanvasViewClient';

interface PageProps {
    params: Promise<{
        token: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { token } = await params;
    const supabase = await createClient();

    const { data: canvas } = await supabase
        .from('shared_canvas_items')
        .select('title, description, thumbnail_url, canvas_type, creator_username, creator_display_name, tags')
        .eq('share_token', token)
        .single();

    if (!canvas) {
        return {
            title: 'Shared Canvas | AI Matrx',
            description: 'View and interact with shared canvas content on AI Matrx.',
        };
    }

    const meta = getCanvasBlockMeta(canvas.canvas_type ?? 'canvas');
    const creator = canvas.creator_display_name ?? canvas.creator_username ?? null;
    const pageTitle = `${canvas.title} | ${meta.label} on AI Matrx`;
    const description = canvas.description
        || buildCanvasDescription(canvas.canvas_type ?? 'canvas', canvas.title, creator);

    // Use dynamically generated OG image (opengraph-image.tsx handles this automatically
    // via Next.js file-based conventions), but fall back to thumbnail or generic if needed.
    const ogImageUrl = canvas.thumbnail_url || siteConfig.ogImage;
    const url = `${siteConfig.url}/canvas/shared/${token}`;

    // Merge block-type keywords with any canvas tags
    const keywords = [
        ...meta.keywords,
        ...(canvas.tags ?? []),
        'AI Matrx',
        'interactive',
        'shared canvas',
    ];

    return {
        title: pageTitle,
        description,
        keywords,
        authors: creator ? [{ name: creator }] : undefined,
        openGraph: {
            title: canvas.title,
            description,
            type: 'website',
            url,
            siteName: 'AI Matrx',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: `${canvas.title} — ${meta.label} on AI Matrx`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: canvas.title,
            description,
            images: [ogImageUrl],
            creator: '@aimatrx',
        },
        // Per-route favicon via icon.tsx (Next.js file convention)
        // No need to specify here — icon.tsx at this route level overrides automatically.
        alternates: {
            canonical: url,
        },
    };
}

export default async function SharedCanvasPage({ params }: PageProps) {
    const resolvedParams = await params;
    return <SharedCanvasViewClient shareToken={resolvedParams.token} />;
}

