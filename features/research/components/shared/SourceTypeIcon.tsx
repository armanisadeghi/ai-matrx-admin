'use client';

import { Globe, Play, FileText, File, Pencil, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SiteIcon } from '@ai-matrx/design-system/site-icon';
import type { ResearchSource, SourceType } from '../../types';

const ICON_MAP: Record<SourceType, typeof Globe> = {
    web: Globe,
    youtube: Play,
    pdf: FileText,
    file: File,
    manual: Pencil,
    social: AtSign,
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** The site's own favicon the search provider returned with the hit (Brave `meta_url.favicon`). */
export function searchResultFavicon(raw: ResearchSource['raw_search_result']): string | null {
    if (!isRecord(raw)) return null;
    if (isRecord(raw.meta_url) && typeof raw.meta_url.favicon === 'string') return raw.meta_url.favicon;
    if (isRecord(raw.profile) && typeof raw.profile.img === 'string') return raw.profile.img;
    return null;
}

interface SourceTypeIconProps {
    type: SourceType;
    /** The source row: its own site icon shows, the type icon is only the fallback. */
    source?: Pick<ResearchSource, 'hostname' | 'url' | 'raw_search_result'> | null;
    /** The source's hostname or URL: its own icon shows, the type icon is only the fallback. */
    site?: string | null;
    /** The source's own icon/logo when it has one. */
    iconUrl?: string | null;
    className?: string;
    size?: number;
}

export function SourceTypeIcon({ type, source, site, iconUrl, className, size = 16 }: SourceTypeIconProps) {
    const Icon = ICON_MAP[type] ?? Globe;
    if (source) {
        site = site ?? source.hostname ?? source.url;
        iconUrl = iconUrl ?? searchResultFavicon(source.raw_search_result);
    }
    if (site || iconUrl) {
        return <SiteIcon site={site} iconUrl={iconUrl} fallback={Icon} size={size} className={className} />;
    }
    return <Icon className={cn('shrink-0', className)} size={size} />;
}
