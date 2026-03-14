export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import sharp from 'sharp';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

const BUCKET = 'podcast-assets';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const IMAGE_VARIANTS = [
    { key: 'image_url', width: 1400, height: 1400, suffix: 'cover' },
    { key: 'og_image_url', width: 1200, height: 630, suffix: 'og' },
    { key: 'thumbnail_url', width: 400, height: 400, suffix: 'thumb' },
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

function findFfmpegPath(): string | null {
    // 1. Explicit env override (Docker/CI/Vercel)
    if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;

    // 2. ffmpeg-static bundled binary (works in all environments including Vercel)
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const staticPath = require('ffmpeg-static') as string | null;
        if (staticPath) return staticPath;
    } catch {
        // package not available
    }

    // 3. Common system install locations (local dev, Linux servers)
    const candidates = [
        '/opt/homebrew/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/usr/bin/ffmpeg',
    ];
    for (const p of candidates) {
        try {
            require('fs').accessSync(p, require('fs').constants.X_OK);
            return p;
        } catch {
            // not found at this path
        }
    }

    return null;
}

async function extractVideoFrame(videoBuffer: Buffer, outputPath: string): Promise<void> {
    const ffmpegPath = findFfmpegPath();
    if (!ffmpegPath) throw new Error('ffmpeg not available');

    const ffmpeg = (await import('fluent-ffmpeg')).default;
    ffmpeg.setFfmpegPath(ffmpegPath);

    const tmpInput = path.join(os.tmpdir(), `pc-video-${randomUUID()}.mp4`);
    await fs.writeFile(tmpInput, videoBuffer);

    return new Promise((resolve, reject) => {
        ffmpeg(tmpInput)
            .screenshots({
                count: 1,
                timemarks: ['10%'],
                filename: path.basename(outputPath),
                folder: path.dirname(outputPath),
            })
            .on('end', async () => {
                await fs.unlink(tmpInput).catch(() => {});
                resolve();
            })
            .on('error', async (err) => {
                await fs.unlink(tmpInput).catch(() => {});
                reject(err);
            });
    });
}

async function processAndUploadImage(
    supabase: Awaited<ReturnType<typeof createClient>>,
    supabaseUrl: string,
    imageBuffer: Buffer,
    folder: string
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
            .upload(filePath, processed, {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (error) throw new Error(`Failed to upload ${variant.suffix}: ${error.message}`);

        results[variant.key] = getSupabasePublicUrl(supabaseUrl, BUCKET, filePath);
    }

    return results;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
            return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const fileType = formData.get('type') as 'image' | 'video' | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (!fileType || !['image', 'video'].includes(fileType)) {
            return NextResponse.json({ error: 'type must be "image" or "video"' }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 400 });
        }

        const folder = `${user.id}/${randomUUID()}`;
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const response: UploadAssetsResponse = {
            video_url: null,
            image_url: null,
            og_image_url: null,
            thumbnail_url: null,
        };

        if (fileType === 'image') {
            const imageVariants = await processAndUploadImage(supabase, supabaseUrl, fileBuffer, folder);
            response.image_url = imageVariants.image_url;
            response.og_image_url = imageVariants.og_image_url;
            response.thumbnail_url = imageVariants.thumbnail_url;
        } else {
            // Upload original video
            const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4';
            const videoPath = `${folder}/video.${ext}`;
            const { error: videoError } = await supabase.storage
                .from(BUCKET)
                .upload(videoPath, fileBuffer, {
                    contentType: file.type || 'video/mp4',
                    upsert: true,
                });
            if (videoError) throw new Error(`Video upload failed: ${videoError.message}`);
            response.video_url = getSupabasePublicUrl(supabaseUrl, BUCKET, videoPath);

            // Extract a frame and generate image variants
            const framePath = path.join(os.tmpdir(), `pc-frame-${randomUUID()}.jpg`);
            try {
                await extractVideoFrame(fileBuffer, framePath);
                const frameBuffer = await fs.readFile(framePath);
                const imageVariants = await processAndUploadImage(supabase, supabaseUrl, frameBuffer, folder);
                response.image_url = imageVariants.image_url;
                response.og_image_url = imageVariants.og_image_url;
                response.thumbnail_url = imageVariants.thumbnail_url;
            } catch (frameErr) {
                console.warn('Video frame extraction failed, skipping image variants:', frameErr);
            } finally {
                await fs.unlink(framePath).catch(() => {});
            }
        }

        return NextResponse.json(response);
    } catch (err: unknown) {
        console.error('upload-assets error:', err);
        const message = err instanceof Error ? err.message : 'Upload failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
