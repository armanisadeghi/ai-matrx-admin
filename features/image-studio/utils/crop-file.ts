/**
 * crop-file — extract a sub-rectangle of an image File and return it as a new
 * File, preserving the original mime type where reasonable. Used by the
 * Initial Crop dialog so the rest of the studio sees the cropped image as if
 * it were the original upload.
 */

export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SUPPORTED_OUT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Pick an output mime type. Many browsers can't encode HEIC / TIFF / GIF
 * back out — we fall back to PNG (lossless) for those so the crop step
 * doesn't introduce quality loss. JPEG and WebP keep their own quality.
 */
function pickOutputType(sourceType: string): {
  type: string;
  extension: string;
  quality: number | undefined;
} {
  if (sourceType === "image/jpeg") {
    return { type: "image/jpeg", extension: "jpg", quality: 0.95 };
  }
  if (sourceType === "image/webp") {
    return { type: "image/webp", extension: "webp", quality: 0.95 };
  }
  if (SUPPORTED_OUT_TYPES.has(sourceType)) {
    return {
      type: sourceType,
      extension: sourceType.split("/")[1],
      quality: undefined,
    };
  }
  return { type: "image/png", extension: "png", quality: undefined };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to decode image: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Crop `file` to the given pixel rectangle on the source image. Returns a
 * new File whose name has `-cropped` appended before the extension.
 */
export async function cropFileToFile(
  file: File,
  pixels: CropPixels,
): Promise<File> {
  const img = await loadImageFromFile(file);

  const sx = Math.max(0, Math.round(pixels.x));
  const sy = Math.max(0, Math.round(pixels.y));
  const sw = Math.max(1, Math.round(pixels.width));
  const sh = Math.max(1, Math.round(pixels.height));

  const clampedW = Math.min(sw, img.naturalWidth - sx);
  const clampedH = Math.min(sh, img.naturalHeight - sy);

  const canvas = document.createElement("canvas");
  canvas.width = clampedW;
  canvas.height = clampedH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser cannot create a 2D canvas context");

  ctx.drawImage(img, sx, sy, clampedW, clampedH, 0, 0, clampedW, clampedH);

  const out = pickOutputType(file.type);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
      out.type,
      out.quality,
    );
  });

  const dotIndex = file.name.lastIndexOf(".");
  const stem = dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name;
  const newName = `${stem}-cropped.${out.extension}`;

  return new File([blob], newName, {
    type: out.type,
    lastModified: Date.now(),
  });
}
