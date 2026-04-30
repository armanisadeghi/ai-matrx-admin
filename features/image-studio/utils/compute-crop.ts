import type {
    ImageFit,
    ImagePosition,
    ImagePositionAnchor,
    ImagePositionPoint,
} from "../types";

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

export function isPositionPoint(
    p: ImagePosition,
): p is ImagePositionPoint {
    return typeof p === "object" && p !== null;
}

export function isPositionAnchor(
    p: ImagePosition,
): p is ImagePositionAnchor {
    return typeof p === "string";
}

/**
 * Map an anchor name to its normalized [0..1] focal point. Smart anchors
 * fall back to centre.
 */
export function anchorToFocalPoint(
    anchor: ImagePositionAnchor,
): ImagePositionPoint {
    switch (anchor) {
        case "top-left":
            return { x: 0, y: 0 };
        case "top":
            return { x: 0.5, y: 0 };
        case "top-right":
            return { x: 1, y: 0 };
        case "left":
            return { x: 0, y: 0.5 };
        case "right":
            return { x: 1, y: 0.5 };
        case "bottom-left":
            return { x: 0, y: 1 };
        case "bottom":
            return { x: 0.5, y: 1 };
        case "bottom-right":
            return { x: 1, y: 1 };
        case "center":
        case "attention":
        case "entropy":
        default:
            return { x: 0.5, y: 0.5 };
    }
}

/**
 * Snap a focal point to its nearest anchor when it lands within ε of one of
 * the 9 compass points. Used by the drag-to-adjust UI so a tiny mouse jitter
 * doesn't lose the "Center" pill.
 */
export function snapPointToAnchor(
    point: ImagePositionPoint,
    epsilon = 0.02,
): ImagePositionAnchor | null {
    const stops = [
        { name: "top-left" as const, x: 0, y: 0 },
        { name: "top" as const, x: 0.5, y: 0 },
        { name: "top-right" as const, x: 1, y: 0 },
        { name: "left" as const, x: 0, y: 0.5 },
        { name: "center" as const, x: 0.5, y: 0.5 },
        { name: "right" as const, x: 1, y: 0.5 },
        { name: "bottom-left" as const, x: 0, y: 1 },
        { name: "bottom" as const, x: 0.5, y: 1 },
        { name: "bottom-right" as const, x: 1, y: 1 },
    ];
    for (const s of stops) {
        if (Math.abs(point.x - s.x) <= epsilon && Math.abs(point.y - s.y) <= epsilon) {
            return s.name;
        }
    }
    return null;
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

    const smart =
        typeof position === "string" &&
        (position === "attention" || position === "entropy");

    // Resolve to a normalized focal point in [0..1].
    const focal: ImagePositionPoint = smart
        ? { x: 0.5, y: 0.5 }
        : isPositionPoint(position)
          ? {
                x: Math.max(0, Math.min(1, position.x)),
                y: Math.max(0, Math.min(1, position.y)),
            }
          : anchorToFocalPoint(position as ImagePositionAnchor);

    const maxX = srcW - cropW;
    const maxY = srcH - cropH;

    // The focal point is the desired centre of the crop; clamp into the
    // image so the rectangle never escapes the source.
    const idealLeft = focal.x * srcW - cropW / 2;
    const idealTop = focal.y * srcH - cropH / 2;
    const x = Math.max(0, Math.min(maxX > 0 ? maxX : 0, idealLeft));
    const y = Math.max(0, Math.min(maxY > 0 ? maxY : 0, idealTop));

    return { x, y, w: cropW, h: cropH, exact: !smart };
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
