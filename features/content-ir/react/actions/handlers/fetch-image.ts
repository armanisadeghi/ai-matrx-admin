/**
 * `fetch_image` — a shape asks the host for an image's BYTES: a web address
 * (`{ url }`, fetched through the platform's SSRF-guarded image door,
 * `/api/image-proxy`) or a saved file (`{ file_id }`, read with the reader's
 * own authorization). The answer is the Blob itself; the kit's `KindImage`
 * turns it into a local `blob:` URL — in the page and inside the sealed frame
 * alike (a Blob crosses the frame's port as a structured clone). The frame
 * never reaches the network itself (`connect-src 'none'`).
 *
 * Checked here, whatever fetched it: the bytes must BE an image, and at most
 * `MAX_IMAGE_BYTES`.
 *
 * Input: { url: string } | { file_id: string }
 * Result: { blob: Blob, mime_type: string, size: number }
 */

import { formatFileSize } from "@ai-matrx/kit/format";
import type {
  KindActionContext,
  KindActionDefinition,
  KindActionResult,
} from "../kind-action-context";

/** The image door's own ceiling (app/api/image-proxy/route.ts MAX_BYTES). */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export type FetchImageSource = { url: string } | { fileId: string };

/** Pure: what the shape asked for, or the sentence refusing it. */
export function parseFetchImage(input: unknown): FetchImageSource | { error: string } {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  const fileId = obj?.file_id;
  if (typeof fileId === "string" && fileId.trim()) return { fileId: fileId.trim() };
  const url = obj?.url;
  if (typeof url !== "string" || !url.trim()) return { error: "This image has no address or saved file." };
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { error: "This image address is not a valid web address." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { error: "Only web (https) image addresses load in a shape." };
  }
  return { url: parsed.href };
}

/** Pure: the fetched bytes are an image within the cap, or the sentence saying why not. */
export function checkImageBytes(blob: Blob, saved = false): { ok: true } | { error: string } {
  const type = blob.type.toLowerCase();
  // A saved file's bytes may come back untyped; its record already says what it is.
  const untyped = !type || type === "application/octet-stream";
  if (!type.startsWith("image/") && !(saved && untyped)) {
    return { error: "That address is not an image." };
  }
  if (blob.size > MAX_IMAGE_BYTES) {
    return { error: `This image is larger than ${formatFileSize(MAX_IMAGE_BYTES)}, so it was not loaded.` };
  }
  return { ok: true };
}

async function fetchImageHandler(input: unknown, ctx: KindActionContext): Promise<KindActionResult> {
  const parsed = parseFetchImage(input);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  if (!ctx.fetchImage) return { ok: false, error: "Images can't be loaded on this page." };
  let blob: Blob;
  try {
    blob = await ctx.fetchImage(parsed);
  } catch {
    return { ok: false, error: "This image couldn't be loaded." };
  }
  const checked = checkImageBytes(blob, "fileId" in parsed);
  if ("error" in checked) return { ok: false, error: checked.error };
  return { ok: true, result: { blob, mime_type: blob.type, size: blob.size } };
}

export const fetchImageAction: KindActionDefinition = {
  key: "fetch_image",
  label: "Load image",
  description:
    "Load an image's bytes for a shape: a web address (through the platform image door) or a saved file. Images only, size-capped.",
  handler: fetchImageHandler,
};
