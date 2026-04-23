export const runtime = 'nodejs';

/**
 * Generalized IMAGE upload route.
 *
 * Accepts a single image file + a preset name (or explicit variants),
 * runs Sharp server-side to generate every configured size, uploads each
 * variant to Supabase Storage, and returns the resulting public URLs.
 *
 * Originated as the podcast cover-art pipeline (see
 * features/podcasts/components/admin/AssetUploader.tsx). Generalized so any
 * place in the app that needs "upload an image and get back consistently
 * sized variants" can share the same server implementation.
 *
 * Presets (keyed on the client):
 *   - social   : 1400²  cover, 1200×630 OG, 400²  thumbnail      (default)
 *   - cover    : 1200×630 only (OG/link-preview images)
 *   - avatar   : 400² avatar, 128² thumb, 48² tiny
 *   - logo     : 512² logo,   200² medium, 64² small
 *   - favicon  : 192² primary, 64² small
 *   - square   : 1024² single square
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

// ── Config ────────────────────────────────────────────────────────────────
const DEFAULT_BUCKET = 'userContent';
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const JPEG_QUALITY = 85;

type ImageVariantKey =
    | 'image_url'
    | 'og_image_url'
    | 'thumbnail_url'
    | 'tiny_url';

export interface ImageVariantSpec {
    key: ImageVariantKey;
    width: number;
    height: number;
    suffix: string;
}

export const IMAGE_PRESETS = {
    social: [
        { key: 'image_url',     width: 1400, height: 1400, suffix: 'cover' },
        { key: 'og_image_url',  width: 1200, height: 630,  suffix: 'og' },
        { key: 'thumbnail_url', width: 400,  height: 400,  suffix: 'thumb' },
        { key: 'tiny_url',      width: 128,  height: 128,  suffix: 'tiny' },
    ],
    cover: [
        { key: 'image_url',     width: 1200, height: 630,  suffix: 'cover' },
        { key: 'thumbnail_url', width: 600,  height: 315,  suffix: 'thumb' },
        { key: 'tiny_url',      width: 200,  height: 105,  suffix: 'tiny' },
    ],
    avatar: [
        { key: 'image_url',     width: 400, height: 400, suffix: 'avatar' },
        { key: 'thumbnail_url', width: 128, height: 128, suffix: 'thumb' },
        { key: 'tiny_url',      width: 48,  height: 48,  suffix: 'tiny' },
    ],
    logo: [
        { key: 'image_url',     width: 512, height: 512, suffix: 'logo' },
        { key: 'thumbnail_url', width: 200, height: 200, suffix: 'medium' },
        { key: 'tiny_url',      width: 64,  height: 64,  suffix: 'small' },
    ],
    favicon: [
        { key: 'image_url',     width: 192, height: 192, suffix: 'favicon' },
        { key: 'tiny_url',      width: 64,  height: 64,  suffix: 'small' },
    ],
    square: [
        { key: 'image_url',     width: 1024, height: 1024, suffix: 'square' },
    ],
} as const satisfies Record<string, readonly ImageVariantSpec[]>;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

export interface ImageUploadResponse {
    primary_url: string;
    image_url: string;
    og_image_url: string | null;
    thumbnail_url: string | null;
    tiny_url: string | null;
    preset: string;
    bucket: string;
    folder: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getSupabasePublicUrl(supabaseUrl: string, bucket: string, filePath: string): string {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

function isPresetName(value: unknown): value is ImagePreset {
    return typeof value === 'string' && value in IMAGE_PRESETS;
}

function sanitizeFolderSegment(raw: string | null): string | null {
    if (!raw) return null;
    const cleaned = raw
        .replace(/[^a-zA-Z0-9\-_/]/g, '')
        .replace(/\/+/g, '/')
        .replace(/^\/+|\/+$/g, '');
    return cleaned || null;
}

async function processAndUploadImage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    supabaseUrl: string,
    imageBuffer: Buffer,
    bucket: string,
    folder: string,
    variants: readonly ImageVariantSpec[],
): Promise<Partial<Record<ImageVariantKey, string>>> {
    const results: Partial<Record<ImageVariantKey, string>> = {};

    for (const variant of variants) {
        const processed = await sharp(imageBuffer)
            .resize(variant.width, variant.height, { fit: 'cover', position: 'center' })
            .jpeg({ quality: JPEG_QUALITY, progressive: true })
            .toBuffer();

        const filePath = `${folder}/${variant.suffix}.jpg`;
        const { error } = await supabase.storage
            .from(bucket)
            .upload(filePath, processed, { contentType: 'image/jpeg', upsert: true });

        if (error) throw new Error(`Failed to upload ${variant.suffix}: ${error.message}`);
        results[variant.key] = getSupabasePublicUrl(supabaseUrl, bucket, filePath);
    }

    return results;
}

// ── Route handler ─────────────────────────────────────────────────────────
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
        const presetRaw = formData.get('preset');
        const bucketRaw = formData.get('bucket');
        const folderRaw = formData.get('folder');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }
        if (file.size > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image exceeds 20MB limit' }, { status: 400 });
        }

        const preset: ImagePreset = isPresetName(presetRaw) ? presetRaw : 'social';
        const variants = IMAGE_PRESETS[preset];

        const bucket = (typeof bucketRaw === 'string' && bucketRaw) || DEFAULT_BUCKET;

        const customFolder = sanitizeFolderSegment(typeof folderRaw === 'string' ? folderRaw : null);
        const folder = customFolder
            ? `${user.id}/${customFolder}/${randomUUID()}`
            : `${user.id}/${randomUUID()}`;

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const variantUrls = await processAndUploadImage(
            supabase,
            supabaseUrl,
            fileBuffer,
            bucket,
            folder,
            variants,
        );

        const primary = variantUrls.image_url;
        if (!primary) {
            return NextResponse.json(
                { error: 'Upload completed but no primary variant was produced' },
                { status: 500 },
            );
        }

        return NextResponse.json({
            primary_url: primary,
            image_url: primary,
            og_image_url: variantUrls.og_image_url ?? null,
            thumbnail_url: variantUrls.thumbnail_url ?? null,
            tiny_url: variantUrls.tiny_url ?? null,
            preset,
            bucket,
            folder,
        } satisfies ImageUploadResponse);
    } catch (err: unknown) {
        console.error('[api/images/upload] error:', err);
        const message = err instanceof Error ? err.message : 'Upload failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
