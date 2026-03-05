import React from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { SharedCanvasView } from '@/features/canvas/shared/SharedCanvasView';
import { siteConfig } from '@/config/extras/site';

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
        .select('title, description, thumbnail_url, canvas_type, creator_username')
        .eq('share_token', token)
        .single();

    if (!canvas) {
        return {
            title: 'Shared Canvas | AI Matrx',
            description: 'View and interact with shared canvas content on AI Matrx.',
        };
    }

    const title = `${canvas.title} | AI Matrx Canvas`;
    const description = canvas.description || `A ${canvas.canvas_type ?? 'canvas'} shared by ${canvas.creator_username ?? 'someone'} on AI Matrx.`;
    const image = canvas.thumbnail_url || siteConfig.ogImage;
    const url = `${siteConfig.url}/canvas/shared/${token}`;

    return {
        title,
        description,
        openGraph: {
            title: canvas.title,
            description,
            type: 'website',
            url,
            siteName: 'AI Matrx',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: canvas.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: canvas.title,
            description,
            images: [image],
            creator: '@aimatrx',
        },
    };
}

export default async function SharedCanvasPage({ params }: PageProps) {
    const resolvedParams = await params;
    
    return <SharedCanvasView shareToken={resolvedParams.token} />;
}

