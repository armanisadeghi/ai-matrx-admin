/**
 * Feedback Image Proxy API Route
 *
 * Generates signed URLs for feedback item screenshots stored in Supabase Storage.
 * This is needed because feedback images are stored in user-specific paths
 * and may not be publicly accessible due to RLS policies.
 *
 * GET /api/admin/feedback/images?feedback_id=uuid
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Extract bucket name and file path from a Supabase storage URL
 * URLs follow the pattern: .../storage/v1/render/image/sign/{bucket}/{path}?token=...
 * or: .../storage/v1/object/public/{bucket}/{path}
 * or: .../storage/v1/object/sign/{bucket}/{path}?token=...
 */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // Match various Supabase storage URL patterns
        const patterns = [
            /\/storage\/v1\/(?:render\/image|object)\/(?:sign|public)\/([^/]+)\/(.+)/,
        ];

        for (const pattern of patterns) {
            const match = pathname.match(pattern);
            if (match) {
                return {
                    bucket: match[1],
                    path: decodeURIComponent(match[2]),
                };
            }
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

        // Get feedback_id from query params
        const feedbackId = request.nextUrl.searchParams.get('feedback_id');
        if (!feedbackId) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameter: feedback_id' },
                { status: 400 }
            );
        }

        // Fetch the feedback item
        const { data: feedback, error: fetchError } = await supabase
            .from('user_feedback')
            .select('id, image_urls')
            .eq('id', feedbackId)
            .single();

        if (fetchError || !feedback) {
            return NextResponse.json(
                { success: false, error: 'Feedback item not found' },
                { status: 404 }
            );
        }

        if (!feedback.image_urls || feedback.image_urls.length === 0) {
            return NextResponse.json({
                success: true,
                signed_urls: [],
            });
        }

        // Generate signed URLs for each image
        const signedUrls: { original_url: string; signed_url: string | null; error?: string }[] = [];

        for (const url of feedback.image_urls) {
            const parsed = parseStorageUrl(url);
            if (!parsed) {
                signedUrls.push({ original_url: url, signed_url: null, error: 'Could not parse storage URL' });
                continue;
            }

            const { data, error } = await supabase.storage
                .from(parsed.bucket)
                .createSignedUrl(parsed.path, 3600); // 1 hour expiry

            if (error) {
                signedUrls.push({ original_url: url, signed_url: null, error: error.message });
            } else {
                signedUrls.push({ original_url: url, signed_url: data.signedUrl });
            }
        }

        return NextResponse.json({
            success: true,
            feedback_id: feedbackId,
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
