import { generateSVGFavicon, svgToDataURI } from '@/utils/favicon-utils';
import type { Metadata } from 'next';

// Default Prompt Apps favicon: emerald "PA" (matches navigation-links.tsx)
const DEFAULT_PROMPT_APP_FAVICON = { color: '#10b981', letter: 'PA' };

/**
 * Generate the icons metadata for a prompt app.
 * Uses the app's custom favicon_url if available, otherwise generates
 * a default emerald "PA" SVG data URI inline.
 */
export function getPromptAppIconsMetadata(faviconUrl?: string | null): Metadata['icons'] {
    if (faviconUrl) {
        return {
            icon: [
                { url: faviconUrl, type: 'image/svg+xml' },
            ],
        };
    }

    // Fallback: generate default emerald PA favicon as data URI
    const svg = generateSVGFavicon(DEFAULT_PROMPT_APP_FAVICON);
    const dataURI = svgToDataURI(svg);

    return {
        icon: [
            { url: dataURI, type: 'image/svg+xml' },
        ],
    };
}
