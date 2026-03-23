import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { PromptAppPublicRendererFastAPI } from '@/features/prompt-apps/components/PromptAppPublicRendererFastAPI';
import { getPromptAppIconsMetadata } from '@/features/prompt-apps/utils/favicon-metadata';
import { BACKEND_URLS, ENDPOINTS } from '@/lib/api/endpoints';
import type { Metadata } from 'next';

export const revalidate = 3600; // Revalidate every hour

// Helper to check if string is a valid UUID
function isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

export async function generateMetadata({
    params
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    // Determine if we're searching by ID or slug
    const isId = isUUID(slug);
    const column = isId ? 'id' : 'slug';

    const { data: app } = await supabase
        .from('prompt_apps')
        .select('name, tagline, description, preview_image_url, favicon_url')
        .eq(column, slug)
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
        icons: getPromptAppIconsMetadata(app.favicon_url),
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

    // Determine if we're searching by ID or slug
    const isId = isUUID(slug);

    // SECURITY: Use public-safe RPC that omits prompt secrets (messages, settings, variable_defaults).
    // Execution data is fetched server-side by AI Dream — React never sees it.
    const { data: appData, error } = await supabase
        .rpc('get_prompt_app_public_data', {
            p_slug: !isId ? slug : null,
            p_app_id: isId ? slug : null
        })
        .single();

    if (error || !appData) {
        notFound();
    }

    const app = appData as any;

    // Fire-and-forget: warm the app's pinned version on the Python backend (server → server)
    const warmUrl = `${BACKEND_URLS.production}${ENDPOINTS.ai.appWarm(app.id)}`;
    fetch(warmUrl, { method: 'POST' }).catch(() => {});

    return (
        <PromptAppPublicRendererFastAPI
            app={app}
            slug={app.slug}
        />
    );
}

