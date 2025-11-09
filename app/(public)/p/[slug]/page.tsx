import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { PromptAppRenderer } from '@/features/prompt-apps/components/PromptAppRenderer';
import type { Metadata } from 'next';

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata({
    params
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: app } = await supabase
        .from('prompt_apps')
        .select('name, tagline, description, preview_image_url')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (!app) {
        return {
            title: 'App Not Found',
        };
    }

    return {
        title: `${app.name} | AI Matrx Apps`,
        description: app.tagline || app.description || `Try ${app.name} - An AI-powered app`,
        openGraph: {
            title: app.name,
            description: app.tagline || app.description || `Try ${app.name}`,
            images: app.preview_image_url ? [app.preview_image_url] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: app.name,
            description: app.tagline || app.description || `Try ${app.name}`,
            images: app.preview_image_url ? [app.preview_image_url] : [],
        },
    };
}

export default async function PromptAppPage({
    params
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const supabase = await createClient();

    // Fetch app with component code (service role required)
    const { data: app, error } = await supabase
        .from('prompt_apps')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (error || !app) {
        notFound();
    }

    return (
        <PromptAppRenderer
            app={app}
            slug={slug}
        />
    );
}

