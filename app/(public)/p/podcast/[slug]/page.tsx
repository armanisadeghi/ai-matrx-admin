import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { Metadata } from 'next';
import { PodcastEpisodePage } from '@/features/podcasts/components/player/PodcastEpisodePage';
import { PodcastShowPage } from '@/features/podcasts/components/player/PodcastShowPage';
import type { PcEpisodeWithShow, PcShow, PcEpisode } from '@/features/podcasts/types';

export const revalidate = 3600;

const DEFAULT_OG_IMAGE = '/images/podcast-default-og.png';

function isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// React.cache deduplicates calls within a single render pass —
// generateMetadata and the page component share one DB round-trip.
const resolveSlug = cache(async (slug: string) => {
    const supabase = await createClient();

    // Try episode first — include all show fields needed for display and OG metadata
    const episodeQuery = supabase
        .from('pc_episodes')
        .select('*, show:pc_shows(id, slug, title, description, image_url, og_image_url, thumbnail_url, author, is_published, created_at, updated_at)');

    const { data: episode } = isUUID(slug)
        ? await episodeQuery.eq('id', slug).single()
        : await episodeQuery.eq('slug', slug).single();

    if (episode) {
        return { type: 'episode' as const, data: episode as PcEpisodeWithShow };
    }

    // Try show (slug or UUID)
    const showQuery = supabase.from('pc_shows').select('*');

    const { data: show } = isUUID(slug)
        ? await showQuery.eq('id', slug).single()
        : await showQuery.eq('slug', slug).single();

    if (show) {
        return { type: 'show' as const, data: show as PcShow };
    }

    return null;
});

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const result = await resolveSlug(slug);

    if (!result) {
        return { title: 'Episode Not Found' };
    }

    if (result.type === 'episode') {
        const ep = result.data;
        // Prefer dedicated OG image (1200×630), fall back to cover, then show cover, then default
        const ogImage = ep.og_image_url ?? ep.image_url ?? ep.show?.og_image_url ?? ep.show?.image_url ?? DEFAULT_OG_IMAGE;
        const showName = ep.show?.title;
        const title = showName ? `${ep.title} — ${showName}` : ep.title;

        return {
            title: `${title} | Podcast`,
            description: ep.description ?? `Listen to ${ep.title}`,
            openGraph: {
                title,
                description: ep.description ?? `Listen to ${ep.title}`,
                images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
                type: 'music.song',
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description: ep.description ?? `Listen to ${ep.title}`,
                images: ogImage ? [ogImage] : [],
            },
        };
    }

    // Show metadata
    const show = result.data;
    const showOgImage = show.og_image_url ?? show.image_url ?? DEFAULT_OG_IMAGE;
    return {
        title: `${show.title} | Podcast`,
        description: show.description ?? `Listen to ${show.title}`,
        openGraph: {
            title: show.title,
            description: show.description ?? `Listen to ${show.title}`,
            images: showOgImage ? [{ url: showOgImage, width: 1200, height: 630 }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: show.title,
            description: show.description ?? `Listen to ${show.title}`,
            images: showOgImage ? [showOgImage] : [],
        },
    };
}

export default async function PodcastPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const result = await resolveSlug(slug);

    if (!result) {
        notFound();
    }

    if (result.type === 'episode') {
        return <PodcastEpisodePage episode={result.data} />;
    }

    // Show page — fetch its published episodes
    const supabase = await createClient();
    const { data: episodes } = await supabase
        .from('pc_episodes')
        .select('*')
        .eq('show_id', result.data.id)
        .eq('is_published', true)
        .order('episode_number', { ascending: true, nullsFirst: false });

    return (
        <PodcastShowPage
            show={result.data}
            episodes={(episodes ?? []) as PcEpisode[]}
        />
    );
}
