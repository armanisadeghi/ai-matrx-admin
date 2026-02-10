import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';

// Deterministic color palette for favicons - vibrant, distinct colors
const FAVICON_COLORS = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#6366f1', // indigo
    '#a855f7', // purple
    '#f43f5e', // rose
    '#0ea5e9', // sky
    '#84cc16', // lime
    '#d946ef', // fuchsia
];

/**
 * Generate a deterministic color from a string (app name or id)
 */
function getColorFromString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return FAVICON_COLORS[Math.abs(hash) % FAVICON_COLORS.length];
}

/**
 * Extract initials from an app name (1-2 characters)
 */
function getInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'A';
    if (words.length === 1) {
        // Single word: use first 1-2 chars
        return words[0].substring(0, 2).toUpperCase();
    }
    // Multiple words: first letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Generate a clean SVG favicon string
 */
function generateFaviconSVG(color: string, initials: string): string {
    const fontSize = initials.length === 1 ? 48 : initials.length === 2 ? 36 : 28;
    const yPosition = initials.length === 1 ? 56 : 54;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${color}" rx="12"/>
  <text x="32" y="${yPosition}" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="700" fill="white" text-anchor="middle">${initials}</text>
</svg>`;
}

/**
 * POST /api/prompt-apps/generate-favicon
 * 
 * Generates an SVG favicon for a prompt app, uploads it to Supabase Storage,
 * and updates the prompt_apps record with the favicon_url.
 * 
 * Body: { appId: string, name: string, color?: string }
 * Returns: { success: true, faviconUrl: string }
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate the user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { appId, name, color } = body as {
            appId: string;
            name: string;
            color?: string;
        };

        if (!appId || !name) {
            return NextResponse.json(
                { success: false, error: 'appId and name are required' },
                { status: 400 }
            );
        }

        // Verify the user owns this app
        const { data: app, error: appError } = await supabase
            .from('prompt_apps')
            .select('id, user_id')
            .eq('id', appId)
            .single();

        if (appError || !app) {
            return NextResponse.json(
                { success: false, error: 'App not found' },
                { status: 404 }
            );
        }

        if (app.user_id !== user.id) {
            return NextResponse.json(
                { success: false, error: 'You do not own this app' },
                { status: 403 }
            );
        }

        // Generate favicon
        const faviconColor = color || getColorFromString(name);
        const initials = getInitials(name);
        const svg = generateFaviconSVG(faviconColor, initials);

        // Upload to Supabase Storage using admin client (bypasses RLS on storage)
        const adminClient = createAdminClient();
        const storagePath = `prompt-app-favicons/${appId}.svg`;

        // Delete existing favicon if any (upsert)
        await adminClient.storage
            .from('app-assets')
            .remove([storagePath]);

        // Upload new favicon
        const svgBuffer = new TextEncoder().encode(svg);
        const { error: uploadError } = await adminClient.storage
            .from('app-assets')
            .upload(storagePath, svgBuffer, {
                contentType: 'image/svg+xml',
                cacheControl: '86400', // 24 hour cache
                upsert: true,
            });

        if (uploadError) {
            console.error('Favicon upload error:', uploadError);
            return NextResponse.json(
                { success: false, error: 'Failed to upload favicon' },
                { status: 500 }
            );
        }

        // Get the public URL
        const { data: urlData } = adminClient.storage
            .from('app-assets')
            .getPublicUrl(storagePath);

        const faviconUrl = urlData.publicUrl;

        // Update the prompt_apps record
        const { error: updateError } = await adminClient
            .from('prompt_apps')
            .update({ favicon_url: faviconUrl })
            .eq('id', appId);

        if (updateError) {
            console.error('Favicon URL update error:', updateError);
            // Non-fatal — the favicon was uploaded, just not linked
        }

        return NextResponse.json({
            success: true,
            faviconUrl,
            color: faviconColor,
            initials,
        });
    } catch (error) {
        console.error('Generate favicon error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
