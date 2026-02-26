/**
 * Feedback Image Proxy API Route
 *
 * Generates signed URLs for feedback item screenshots stored in Supabase Storage.
 * This is needed because feedback images are stored in user-specific paths
 * and may not be publicly accessible due to RLS policies.
 *
 * GET /api/admin/feedback/images?feedback_id=uuid   — feedback item screenshots
 * GET /api/admin/feedback/images?message_id=uuid    — message attachment images
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Returns true if the stored URL is already a permanent public URL
 * (i.e. /storage/v1/object/public/...) that never expires.
 */
function isPublicUrl(url: string): boolean {
    try {
        const pathname = new URL(url).pathname;
        return /\/storage\/v1\/object\/public\//.test(pathname);
    } catch {
        return false;
    }
}

/**
 * Extract bucket name and file path from a Supabase storage URL.
 * Handles signed URLs: .../storage/v1/render/image/sign/{bucket}/{path}?token=...
 * and legacy signed object URLs: .../storage/v1/object/sign/{bucket}/{path}?token=...
 */
function parseSignedStorageUrl(url: string): { bucket: string; path: string } | null {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        const pattern = /\/storage\/v1\/(?:render\/image|object)\/sign\/([^/]+)\/(.+)/;
        const match = pathname.match(pattern);
        if (match) {
            return {
                bucket: match[1],
                path: decodeURIComponent(match[2]),
            };
        }

        return null;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { success: false, error: 'User not authenticated' },
                { status: 401 }
            );
        }

        const feedbackId = request.nextUrl.searchParams.get('feedback_id');
        const messageId = request.nextUrl.searchParams.get('message_id');

        if (!feedbackId && !messageId) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameter: feedback_id or message_id' },
                { status: 400 }
            );
        }

        // Resolve image_urls from either a feedback item or a message
        let rawUrls: string[] = [];

        if (feedbackId) {
            const { data: feedback, error: fetchError } = await supabase
                .from('user_feedback')
                .select('id, image_urls')
                .eq('id', feedbackId)
                .single();

            if (fetchError || !feedback) {
                return NextResponse.json({ success: false, error: 'Feedback item not found' }, { status: 404 });
            }
            rawUrls = feedback.image_urls ?? [];
        } else {
            const { data: message, error: fetchError } = await supabase
                .from('feedback_user_messages')
                .select('id, image_urls')
                .eq('id', messageId!)
                .single();

            if (fetchError || !message) {
                return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
            }
            rawUrls = message.image_urls ?? [];
        }

        if (rawUrls.length === 0) {
            return NextResponse.json({ success: true, signed_urls: [] });
        }

        // Resolve URLs — public URLs pass through, legacy signed URLs get re-signed for 24h.
        const signedUrls: { original_url: string; signed_url: string | null; error?: string }[] = [];

        for (const url of rawUrls) {
            if (isPublicUrl(url)) {
                signedUrls.push({ original_url: url, signed_url: url });
                continue;
            }

            const parsed = parseSignedStorageUrl(url);
            if (!parsed) {
                signedUrls.push({ original_url: url, signed_url: null, error: 'Could not parse storage URL' });
                continue;
            }

            const { data, error } = await supabase.storage
                .from(parsed.bucket)
                .createSignedUrl(parsed.path, 86400);

            if (error) {
                signedUrls.push({ original_url: url, signed_url: null, error: error.message });
            } else {
                signedUrls.push({ original_url: url, signed_url: data.signedUrl });
            }
        }

        return NextResponse.json({
            success: true,
            ...(feedbackId ? { feedback_id: feedbackId } : { message_id: messageId }),
            signed_urls: signedUrls,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to generate signed URLs';
        console.error('Error in GET /api/admin/feedback/images:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
