import type { ImageFit, ImagePosition } from "../types";

export interface SourceCropRect {
    /** Top-left corner of the rectangle on the source image. */
    x: number;
    y: number;
    /** Size of the rectangle on the source image. */
    w: number;
    h: number;
    /** Whether the rectangle is a true client-side representation of
     *  what the server will do. Smart crops (attention / entropy) are
     *  computed by Sharp and can't be mirrored locally, so we return
     *  `false` and a center-anchored fallback rectangle. */
    exact: boolean;
}

/**
 * Compute the source rectangle that will be scaled to fill the target
 * dimensions. Mirrors the Sharp `.resize(w, h, { fit, position })` pipeline
 * closely enough for a live preview.
 *
 * For `contain` / `inside`, no cropping happens — the returned rect is the
 * full source image.
 *
 * For smart positions (`attention`, `entropy`) we cannot replicate Sharp
 * exactly, so we return a center-anchored fallback with `exact: false`
 * so the UI can show a "approximate" badge.
 */
export function computeSourceCropRect(
    srcW: number,
    srcH: number,
    dstW: number,
    dstH: number,
    fit: ImageFit,
    position: ImagePosition,
): SourceCropRect {
    if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
        return { x: 0, y: 0, w: srcW, h: srcH, exact: false };
    }

    if (fit !== "cover") {
        return { x: 0, y: 0, w: srcW, h: srcH, exact: true };
    }

    const srcAspect = srcW / srcH;
    const dstAspect = dstW / dstH;

    let cropW: number;
    let cropH: number;

    if (Math.abs(srcAspect - dstAspect) < 1e-6) {
        cropW = srcW;
        cropH = srcH;
    } else if (srcAspect > dstAspect) {
        // Source is wider than target — crop horizontally, use full height.
        cropH = srcH;
        cropW = srcH * dstAspect;
    } else {
        // Source is taller than target — crop vertically, use full width.
        cropW = srcW;
        cropH = srcW / dstAspect;
    }

    const smart = position === "attention" || position === "entropy";
    const effective: ImagePosition = smart ? "center" : position;

    const { horiz, vert } = decomposePosition(effective);

    const maxX = srcW - cropW;
    const maxY = srcH - cropH;

    let x = 0;
    let y = 0;
    if (maxX > 0) {
        if (horiz === "center") x = maxX / 2;
        else if (horiz === "right") x = maxX;
    }
    if (maxY > 0) {
        if (vert === "center") y = maxY / 2;
        else if (vert === "bottom") y = maxY;
    }

    return { x, y, w: cropW, h: cropH, exact: !smart };
}

type HorizSlot = "left" | "center" | "right";
type VertSlot = "top" | "center" | "bottom";

function decomposePosition(position: ImagePosition): {
    horiz: HorizSlot;
    vert: VertSlot;
} {
    switch (position) {
        case "top-left":
            return { horiz: "left", vert: "top" };
        case "top":
            return { horiz: "center", vert: "top" };
        case "top-right":
            return { horiz: "right", vert: "top" };
        case "left":
            return { horiz: "left", vert: "center" };
        case "center":
            return { horiz: "center", vert: "center" };
        case "right":
            return { horiz: "right", vert: "center" };
        case "bottom-left":
            return { horiz: "left", vert: "bottom" };
        case "bottom":
            return { horiz: "center", vert: "bottom" };
        case "bottom-right":
            return { horiz: "right", vert: "bottom" };
        default:
            return { horiz: "center", vert: "center" };
    }
}

/**
 * Render the target canvas with the preview. Returns void once the draw
 * completes; caller owns the canvas element.
 *
 * We handle three paths:
 *   cover   → drawImage with the computed source rect
 *   contain → fill background, drawImage letterboxed
 *   inside  → if smaller, just drawImage at natural size; otherwise letterbox
 */
export function renderCropToCanvas(
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
    dstW: number,
    dstH: number,
    fit: ImageFit,
    position: ImagePosition,
    backgroundColor: string,
): void {
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    if (srcW <= 0 || srcH <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (fit === "cover") {
        canvas.width = dstW;
        canvas.height = dstH;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, dstW, dstH);
        const rect = computeSourceCropRect(srcW, srcH, dstW, dstH, fit, position);
        ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, dstW, dstH);
        return;
    }

    if (fit === "contain") {
        canvas.width = dstW;
        canvas.height = dstH;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, dstW, dstH);
        const scale = Math.min(dstW / srcW, dstH / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        ctx.drawImage(
            img,
            0,
            0,
            srcW,
            srcH,
            (dstW - drawW) / 2,
            (dstH - drawH) / 2,
            drawW,
            drawH,
        );
        return;
    }

    // inside — never upscales
    const scale = Math.min(dstW / srcW, dstH / srcH, 1);
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    canvas.width = drawW;
    canvas.height = drawH;
    ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, drawW, drawH);
}
