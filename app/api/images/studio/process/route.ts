export const runtime = "nodejs";

/**
 * Image Studio — batch processor
 *
 * Accepts ONE source image + a list of variant specs and returns every
 * variant as a base64 data URL. No storage write — save is a separate
 * endpoint so the user can preview, discard, or pick which variants to
 * keep before uploading.
 *
 * Request (multipart/form-data):
 *   file           — the source image File (required)
 *   spec           — JSON: ProcessStudioRequestBody (required)
 *
 * Response:
 *   200: ProcessStudioResponse
 *   4xx: { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import sharp from "sharp";
import { ALL_PRESETS, getPresetById } from "@/features/image-studio/presets";
import type {
    ImageFit,
    ImagePosition,
    OutputFormat,
    ProcessStudioRequestBody,
    ProcessStudioResponse,
    ProcessStudioResponseVariant,
} from "@/features/image-studio/types";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB
const MIN_QUALITY = 30;
const MAX_QUALITY = 100;

function sanitizeFilenameBase(raw: string): string {
    const stripped = raw.replace(/\.[^.]+$/, "");
    return (
        stripped
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "image"
    );
}

function clampQuality(q: unknown): number {
    const n = Math.round(Number(q));
    if (!Number.isFinite(n)) return 85;
    return Math.max(MIN_QUALITY, Math.min(MAX_QUALITY, n));
}

function isFormat(v: unknown): v is OutputFormat {
    return v === "jpeg" || v === "png" || v === "webp" || v === "avif";
}

function isFit(v: unknown): v is ImageFit {
    return v === "cover" || v === "contain" || v === "inside";
}

const POSITION_SET: ReadonlySet<ImagePosition> = new Set<ImagePosition>([
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "entropy",
    "attention",
]);

function isPosition(v: unknown): v is ImagePosition {
    return typeof v === "string" && POSITION_SET.has(v as ImagePosition);
}

/** Convert our UI position string to the value Sharp accepts. */
function toSharpPosition(p: ImagePosition): string {
    switch (p) {
        case "top-left":
            return "left top";
        case "top-right":
            return "right top";
        case "bottom-left":
            return "left bottom";
        case "bottom-right":
            return "right bottom";
        default:
            return p; // "center" | "top" | "bottom" | "left" | "right" | "entropy" | "attention"
    }
}

function extForFormat(format: OutputFormat): string {
    return format === "jpeg" ? "jpg" : format;
}

function mimeForFormat(format: OutputFormat): string {
    return format === "jpeg" ? "image/jpeg" : `image/${format}`;
}

async function encode(
    pipeline: sharp.Sharp,
    format: OutputFormat,
    quality: number,
): Promise<Buffer> {
    switch (format) {
        case "jpeg":
            return pipeline.jpeg({ quality, progressive: true, mozjpeg: true }).toBuffer();
        case "webp":
            return pipeline.webp({ quality }).toBuffer();
        case "avif":
            return pipeline.avif({ quality }).toBuffer();
        case "png":
            return pipeline.png({ compressionLevel: 9 }).toBuffer();
    }
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

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const specRaw = formData.get("spec");

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "File must be an image" },
                { status: 400 },
            );
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "Image exceeds 25MB limit" },
                { status: 400 },
            );
        }
        if (typeof specRaw !== "string") {
            return NextResponse.json(
                { error: "Missing spec payload" },
                { status: 400 },
            );
        }

        let spec: ProcessStudioRequestBody;
        try {
            spec = JSON.parse(specRaw) as ProcessStudioRequestBody;
        } catch {
            return NextResponse.json(
                { error: "spec is not valid JSON" },
                { status: 400 },
            );
        }

        if (!Array.isArray(spec.variants) || spec.variants.length === 0) {
            return NextResponse.json(
                { error: "spec.variants must contain at least one variant" },
                { status: 400 },
            );
        }

        const quality = clampQuality(spec.quality);
        const defaultFormat: OutputFormat = isFormat(spec.defaultFormat)
            ? spec.defaultFormat
            : "webp";
        const defaultFit: ImageFit = isFit(spec.defaultFit)
            ? spec.defaultFit
            : "cover";
        const defaultPosition: ImagePosition = isPosition(spec.defaultPosition)
            ? spec.defaultPosition
            : "center";
        const backgroundColor =
            typeof spec.backgroundColor === "string" && /^#?[0-9a-fA-F]{3,8}$/.test(spec.backgroundColor)
                ? spec.backgroundColor.startsWith("#")
                    ? spec.backgroundColor
                    : `#${spec.backgroundColor}`
                : "#ffffff";
        const baseName = sanitizeFilenameBase(
            spec.filenameBase || file.name || "image",
        );

        const sourceBuffer = Buffer.from(await file.arrayBuffer());
        const meta = await sharp(sourceBuffer).metadata();
        const originalFormat = meta.format ?? "unknown";
        const originalWidth = meta.width ?? 0;
        const originalHeight = meta.height ?? 0;

        // Process each variant. Collect all as settled so one failure doesn't
        // take down the whole batch.
        const results: ProcessStudioResponseVariant[] = await Promise.all(
            spec.variants.map(async (v) => {
                const preset = getPresetById(v.presetId);
                if (!preset) {
                    return {
                        presetId: v.presetId,
                        filename: "",
                        format: defaultFormat,
                        width: 0,
                        height: 0,
                        quality: null,
                        size: 0,
                        dataUrl: "",
                        compressionRatio: null,
                        fit: defaultFit,
                        position: defaultFit === "cover" ? defaultPosition : null,
                        error: `Unknown preset: ${v.presetId}`,
                    };
                }

                const format: OutputFormat = isFormat(v.format)
                    ? v.format
                    : (preset.defaultFormat ?? defaultFormat);
                const fit: ImageFit = isFit(v.fit) ? v.fit : defaultFit;
                const position: ImagePosition = isPosition(v.position)
                    ? v.position
                    : defaultPosition;

                try {
                    const resizeOpts: sharp.ResizeOptions = {
                        fit,
                        background: backgroundColor,
                        withoutEnlargement: false,
                    };
                    // Position only applies to `cover`. Sharp ignores it for
                    // `contain` / `inside` but keeping it out keeps intent clear.
                    if (fit === "cover") {
                        resizeOpts.position = toSharpPosition(position);
                    }

                    const pipeline = sharp(sourceBuffer)
                        .rotate() // respect EXIF
                        .resize(preset.width, preset.height, resizeOpts);

                    // JPEG / AVIF don't support alpha — flatten onto the
                    // background colour so transparent pixels become opaque.
                    // (Contain-mode padding is already filled via resize's
                    // `background` option — this is for alpha in the source.)
                    if (format === "jpeg" || format === "avif") {
                        pipeline.flatten({ background: backgroundColor });
                    }

                    const outBuffer = await encode(pipeline, format, quality);
                    const outMeta = await sharp(outBuffer).metadata();
                    const actualWidth = outMeta.width ?? preset.width;
                    const actualHeight = outMeta.height ?? preset.height;

                    const ext = extForFormat(format);
                    const filenameBase = sanitizeFilenameBase(v.filenameBase || baseName);
                    const filename = `${filenameBase}-${preset.id}.${ext}`;
                    const dataUrl = `data:${mimeForFormat(format)};base64,${outBuffer.toString("base64")}`;
                    const compressionRatio =
                        file.size > 0
                            ? Math.round((1 - outBuffer.length / file.size) * 100)
                            : null;

                    return {
                        presetId: preset.id,
                        filename,
                        format,
                        width: actualWidth,
                        height: actualHeight,
                        quality: format === "png" ? null : quality,
                        size: outBuffer.length,
                        dataUrl,
                        compressionRatio,
                        fit,
                        position: fit === "cover" ? position : null,
                    };
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "Unknown error";
                    return {
                        presetId: preset.id,
                        filename: "",
                        format,
                        width: preset.width,
                        height: preset.height,
                        quality: null,
                        size: 0,
                        dataUrl: "",
                        compressionRatio: null,
                        fit,
                        position: fit === "cover" ? position : null,
                        error: msg,
                    };
                }
            }),
        );

        const body: ProcessStudioResponse = {
            original: {
                width: originalWidth,
                height: originalHeight,
                size: file.size,
                format: originalFormat,
            },
            variants: results,
        };

        return NextResponse.json(body);
    } catch (err: unknown) {
        console.error("[api/images/studio/process] error:", err);
        const message = err instanceof Error ? err.message : "Processing failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** GET returns the catalog so clients can list presets without redeploying. */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        presets: ALL_PRESETS,
    });
}
