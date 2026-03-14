export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { BACKEND_URLS } from '@/lib/api/endpoints';

const BUCKET = 'podcast-assets';
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

const IMAGE_VARIANTS = [
    { key: 'image_url',      width: 1400, height: 1400, suffix: 'cover' },
    { key: 'og_image_url',   width: 1200, height: 630,  suffix: 'og' },
    { key: 'thumbnail_url',  width: 400,  height: 400,  suffix: 'thumb' },
] as const;

type VariantKey = (typeof IMAGE_VARIANTS)[number]['key'];

export interface UploadAssetsResponse {
    video_url: string | null;
    image_url: string | null;
    og_image_url: string | null;
    thumbnail_url: string | null;
}

function getSupabasePublicUrl(supabaseUrl: string, bucket: string, filePath: string): string {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

async function processAndUploadImage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    supabaseUrl: string,
    imageBuffer: Buffer,
    folder: string,
): Promise<Record<VariantKey, string>> {
    const results = {} as Record<VariantKey, string>;

    for (const variant of IMAGE_VARIANTS) {
        const processed = await sharp(imageBuffer)
            .resize(variant.width, variant.height, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 85, progressive: true })
            .toBuffer();

        const filePath = `${folder}/${variant.suffix}.jpg`;
        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, processed, { contentType: 'image/jpeg', upsert: true });

        if (error) throw new Error(`Failed to upload ${variant.suffix}: ${error.message}`);
        results[variant.key] = getSupabasePublicUrl(supabaseUrl, BUCKET, filePath);
    }

    return results;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
            return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const fileType = formData.get('type') as 'image' | 'video' | null;

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        if (!fileType || !['image', 'video'].includes(fileType)) {
            return NextResponse.json({ error: 'type must be "image" or "video"' }, { status: 400 });
        }

        // ----------------------------------------------------------------
        // IMAGE — processed entirely in Next.js with Sharp (Vercel-safe)
        // ----------------------------------------------------------------
        if (fileType === 'image') {
            if (file.size > MAX_IMAGE_SIZE) {
                return NextResponse.json({ error: 'Image exceeds 20MB limit' }, { status: 400 });
            }

            const folder = `${user.id}/${randomUUID()}`;
            const fileBuffer = Buffer.from(await file.arrayBuffer());
            const imageVariants = await processAndUploadImage(supabase, supabaseUrl, fileBuffer, folder);

            return NextResponse.json({
                video_url: null,
                image_url: imageVariants.image_url,
                og_image_url: imageVariants.og_image_url,
                thumbnail_url: imageVariants.thumbnail_url,
            } satisfies UploadAssetsResponse);
        }

        // ----------------------------------------------------------------
        // VIDEO — forwarded to Python backend (FFmpeg lives there)
        // ----------------------------------------------------------------
        if (file.size > MAX_VIDEO_SIZE) {
            return NextResponse.json({ error: 'Video exceeds 500MB limit' }, { status: 400 });
        }

        // Get the auth token from the current session to pass to Python
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;
        if (!authToken) {
            return NextResponse.json({ error: 'No active session' }, { status: 401 });
        }

        const backendUrl = process.env.BACKEND_URL || BACKEND_URLS.production;
        const pythonEndpoint = `${backendUrl}/api/media/podcast/upload-video`;

        // Forward the file as-is to Python in a new FormData
        const forwardForm = new FormData();
        forwardForm.append('file', file);

        const pythonResponse = await fetch(pythonEndpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}` },
            body: forwardForm,
        });

        if (!pythonResponse.ok) {
            const errText = await pythonResponse.text().catch(() => 'Unknown error');
            console.error(`[upload-assets] Python backend error ${pythonResponse.status}:`, errText);
            return NextResponse.json(
                { error: `Video processing failed: ${errText}` },
                { status: pythonResponse.status },
            );
        }

        const result = await pythonResponse.json() as UploadAssetsResponse;
        return NextResponse.json(result);
    } catch (err: unknown) {
        console.error('[upload-assets] error:', err);
        const message = err instanceof Error ? err.message : 'Upload failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
