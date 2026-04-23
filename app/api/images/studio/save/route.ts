export const runtime = "nodejs";

/**
 * Image Studio — save to library
 *
 * Accepts a list of already-processed variants (base64 data URLs) and
 * uploads each one to Supabase Storage under the authenticated user's
 * folder. Returns the public URLs.
 *
 * Request JSON: SaveStudioRequestBody
 * Response   : SaveStudioResponse
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";
import type {
    SaveStudioRequestBody,
    SaveStudioResponse,
    SaveStudioResponseVariant,
} from "@/features/image-studio/types";

const DEFAULT_BUCKET = "userContent";
const MAX_VARIANTS = 60;

function sanitizeFolderSegment(raw: string | undefined | null): string | null {
    if (!raw) return null;
    const cleaned = raw
        .replace(/[^a-zA-Z0-9\-_/]/g, "")
        .replace(/\/+/g, "/")
        .replace(/^\/+|\/+$/g, "");
    return cleaned || null;
}

function sanitizeFilename(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 120);
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    const mime = match[1];
    try {
        return { mime, buffer: Buffer.from(match[2], "base64") };
    } catch {
        return null;
    }
}

function publicUrlFor(
    supabaseUrl: string,
    bucket: string,
    filePath: string,
): string {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
            return NextResponse.json(
                { error: "Supabase URL not configured" },
                { status: 500 },
            );
        }

        let body: SaveStudioRequestBody;
        try {
            body = (await request.json()) as SaveStudioRequestBody;
        } catch {
            return NextResponse.json(
                { error: "Body is not valid JSON" },
                { status: 400 },
            );
        }

        if (!Array.isArray(body.variants) || body.variants.length === 0) {
            return NextResponse.json(
                { error: "variants must be a non-empty array" },
                { status: 400 },
            );
        }
        if (body.variants.length > MAX_VARIANTS) {
            return NextResponse.json(
                { error: `Cannot save more than ${MAX_VARIANTS} variants at once` },
                { status: 400 },
            );
        }

        const bucket = body.bucket || DEFAULT_BUCKET;
        const folderSegment = sanitizeFolderSegment(body.folder) ?? "image-studio";
        const sessionId = randomUUID();
        const folder = `${user.id}/${folderSegment}/${sessionId}`;

        const saved: SaveStudioResponseVariant[] = await Promise.all(
            body.variants.map(async (v) => {
                if (!v.dataUrl || !v.filename) {
                    return {
                        filename: v.filename ?? "",
                        presetId: v.presetId,
                        publicUrl: "",
                        error: "Missing dataUrl or filename",
                    };
                }

                const parsed = parseDataUrl(v.dataUrl);
                if (!parsed) {
                    return {
                        filename: v.filename,
                        presetId: v.presetId,
                        publicUrl: "",
                        error: "Invalid data URL",
                    };
                }

                const safeName = sanitizeFilename(v.filename);
                const filePath = `${folder}/${safeName}`;

                const { error } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, parsed.buffer, {
                        contentType: parsed.mime,
                        upsert: true,
                    });

                if (error) {
                    return {
                        filename: safeName,
                        presetId: v.presetId,
                        publicUrl: "",
                        error: error.message,
                    };
                }

                return {
                    filename: safeName,
                    presetId: v.presetId,
                    publicUrl: publicUrlFor(supabaseUrl, bucket, filePath),
                };
            }),
        );

        const response: SaveStudioResponse = { bucket, folder, variants: saved };
        return NextResponse.json(response);
    } catch (err: unknown) {
        console.error("[api/images/studio/save] error:", err);
        const message = err instanceof Error ? err.message : "Save failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
