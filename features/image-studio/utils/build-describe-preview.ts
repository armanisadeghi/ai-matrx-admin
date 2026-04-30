"use client";

import {
    DESCRIBE_PREVIEW_MAX_EDGE_PX,
    DESCRIBE_PREVIEW_QUALITY,
} from "../constants/describe";
import { slugifyFilename } from "./slugify-filename";

/**
 * Downscale a source `File` to a small WebP we can ship to the describe
 * agent. The original file may be 25 MB; the preview is typically <80 KB.
 *
 * Stays purely on the canvas — no server round-trip, no Sharp needed.
 */
export async function buildDescribePreview(
    source: File,
    filenameBase: string,
): Promise<File> {
    const objectUrl = URL.createObjectURL(source);
    try {
        const img = await loadImage(objectUrl);
        const { width: srcW, height: srcH } = img;
        if (srcW <= 0 || srcH <= 0) {
            throw new Error("Could not decode image");
        }

        const longest = Math.max(srcW, srcH);
        const scale =
            longest > DESCRIBE_PREVIEW_MAX_EDGE_PX
                ? DESCRIBE_PREVIEW_MAX_EDGE_PX / longest
                : 1;
        const dstW = Math.max(1, Math.round(srcW * scale));
        const dstH = Math.max(1, Math.round(srcH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = dstW;
        canvas.height = dstH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Canvas 2D context unavailable");
        }
        // White background — JPEG/WebP without alpha will read transparent
        // pixels as black otherwise.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, dstW, dstH);
        ctx.drawImage(img, 0, 0, dstW, dstH);

        const blob: Blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => {
                    if (b) resolve(b);
                    else reject(new Error("toBlob produced null"));
                },
                "image/webp",
                DESCRIBE_PREVIEW_QUALITY,
            );
        });

        const safeBase = slugifyFilename(filenameBase);
        return new File([blob], `${safeBase}-describe.webp`, {
            type: "image/webp",
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = src;
    });
}
