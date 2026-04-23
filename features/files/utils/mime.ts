/**
 * features/files/utils/mime.ts
 *
 * Thin mime-type helpers. We rely on the server-set `mime_type` wherever
 * possible; this file just handles the gaps (fall back from extension,
 * detect text-like content).
 */

import { extname } from "./path";

const EXT_TO_MIME: Record<string, string> = {
  // code / text
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  jsx: "text/javascript",
  ts: "text/typescript",
  tsx: "text/typescript",
  py: "text/x-python",
  rb: "text/x-ruby",
  go: "text/x-go",
  rs: "text/x-rust",
  java: "text/x-java",
  c: "text/x-c",
  cpp: "text/x-c++",
  cs: "text/x-csharp",
  swift: "text/x-swift",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  scss: "text/x-scss",
  json: "application/json",
  yaml: "application/yaml",
  yml: "application/yaml",
  md: "text/markdown",
  mdx: "text/markdown",
  txt: "text/plain",
  log: "text/plain",
  xml: "application/xml",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  // documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // media
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  // images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
  // archives
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
};

export function mimeFromFilename(name: string): string {
  const ext = extname(name);
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

export function resolveMime(
  explicit: string | null | undefined,
  filename: string,
): string {
  if (explicit && explicit !== "application/octet-stream") return explicit;
  return mimeFromFilename(filename);
}

export function isTextMime(mime: string): boolean {
  if (mime.startsWith("text/")) return true;
  return (
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/yaml" ||
    mime === "application/x-yaml"
  );
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

export function isAudioMime(mime: string): boolean {
  return mime.startsWith("audio/");
}

export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf";
}
