/**
 * `download` — a shape saves a file to the reader's device through THE
 * platform download door (`@ai-matrx/kit/download`; never a hand-built
 * anchor), in the page and from inside the sealed frame (which has no
 * `allow-downloads`). Two forms:
 *
 *  - content the shape built itself (CSV, Markdown, JSON…):
 *      { filename, content: string | Blob | ArrayBuffer, mime? }
 *      { filename, base64: string, mime? }
 *  - a saved file, by identity: { file_id, filename? } (the canonical
 *    file-handler byte path, the reader's own authorization).
 *
 * The frame relays every `@ai-matrx/kit/download` call here too (its build
 * aliases that module to `FrameDownload`), so the copy menu's Export items
 * work inside a shape.
 *
 * Result: { downloaded: true, filename }
 */

import type {
  KindActionContext,
  KindActionDefinition,
  KindActionResult,
} from "../kind-action-context";

/** Largest file a shape may hand over to save. */
export const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  html: "text/html",
  htm: "text/html",
  xml: "application/xml",
  svg: "image/svg+xml",
  ics: "text/calendar",
  vcf: "text/vcard",
  yaml: "application/yaml",
  yml: "application/yaml",
};

/** Control characters and the path separators/reserved characters no file name may carry. */
const UNSAFE_NAME = /[\u0000-\u001f\u007f<>:"/\\|?*]/g;

/** Pure: a name safe to save under (no path, no control characters, at most 120 characters). */
export function safeDownloadName(raw: unknown, fallback = "download"): string {
  const name = typeof raw === "string" ? raw.replace(UNSAFE_NAME, "-").replace(/^[.\s-]+/, "").trim() : "";
  if (!name) return fallback;
  if (name.length <= 120) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : "";
  return name.slice(0, 120 - ext.length) + ext;
}

/** Pure: the mime type to save under — the shape's own when it gave one, else from the extension. */
export function downloadMime(filename: string, given: unknown): string {
  if (typeof given === "string" && /^[\w.+-]+\/[\w.+-]+(;.*)?$/.test(given.trim())) return given.trim();
  const ext = /\.([a-z0-9]+)$/i.exec(filename)?.[1]?.toLowerCase();
  return (ext && MIME_BY_EXTENSION[ext]) || "application/octet-stream";
}

export type DownloadRequest =
  | { kind: "content"; filename: string; content: BlobPart; mime: string; size: number }
  | { kind: "file"; fileId: string; filename: string | null };

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value.replace(/^data:[^,]*,/, "").replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Pure: what to save, or the sentence refusing it. */
export function parseDownload(input: unknown): DownloadRequest | { error: string } {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  if (!obj) return { error: "Nothing was given to download." };
  const fileId = obj.file_id;
  if (typeof fileId === "string" && fileId.trim()) {
    return {
      kind: "file",
      fileId: fileId.trim(),
      filename: typeof obj.filename === "string" && obj.filename.trim() ? safeDownloadName(obj.filename) : null,
    };
  }
  const filename = safeDownloadName(obj.filename);
  const mime = downloadMime(filename, obj.mime);
  let content: BlobPart;
  let size: number;
  if (typeof obj.content === "string") {
    content = obj.content;
    size = new TextEncoder().encode(obj.content).length;
  } else if (typeof Blob !== "undefined" && obj.content instanceof Blob) {
    content = obj.content;
    size = obj.content.size;
  } else if (obj.content instanceof ArrayBuffer) {
    content = obj.content;
    size = obj.content.byteLength;
  } else if (typeof obj.base64 === "string") {
    const bytes = decodeBase64(obj.base64);
    if (!bytes) return { error: "The file's base64 content could not be read." };
    content = bytes as unknown as BlobPart;
    size = bytes.byteLength;
  } else {
    return { error: "A download needs `content` (text) or `base64`, or a saved `file_id`." };
  }
  if (size > MAX_DOWNLOAD_BYTES) {
    return { error: `This file is larger than ${MAX_DOWNLOAD_BYTES / (1024 * 1024)} MB, so it was not saved.` };
  }
  return { kind: "content", filename, content, mime, size };
}

async function downloadHandler(input: unknown, ctx: KindActionContext): Promise<KindActionResult> {
  const parsed = parseDownload(input);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  if (parsed.kind === "file") {
    if (!ctx.downloadSavedFile) return { ok: false, error: "Saved files can't be downloaded on this page." };
    try {
      await ctx.downloadSavedFile(parsed.fileId, parsed.filename);
    } catch {
      return { ok: false, error: "This file couldn't be downloaded." };
    }
    return { ok: true, result: { downloaded: true, filename: parsed.filename } };
  }
  if (!ctx.downloadContent) return { ok: false, error: "Downloads aren't available on this page." };
  ctx.downloadContent(parsed.filename, parsed.content, parsed.mime);
  return { ok: true, result: { downloaded: true, filename: parsed.filename } };
}

export const downloadAction: KindActionDefinition = {
  key: "download",
  label: "Download",
  description:
    "Save a file to the reader's device through the platform download door: content the shape built (text or base64) or a saved file (file_id).",
  handler: downloadHandler,
};
