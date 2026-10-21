/**
 * The host side of the media kit's actions (`fetch_image`, `download`,
 * `print`): each one is the platform's canonical door, bound once here so the
 * handlers stay pure and the runner stays one spread.
 *
 *  - image bytes: web addresses through `/api/image-proxy` (SSRF-guarded,
 *    image-only, 20 MB), saved files through the reader's bearer lane;
 *  - downloads: `@ai-matrx/kit/download` (content) and the file handler's
 *    byte path (`downloadMediaSource`, saved files);
 *  - print: `@ai-matrx/print` (`printMarkdown`, or sanitized HTML through
 *    `buildPrintDocument` + `openPrintWindow`).
 */

import { downloadFile as saveToDevice } from "@ai-matrx/kit/download";
import { downloadFile as readSavedFile } from "@/features/files/api/files";
import { downloadMediaSource } from "@/features/files/media-client/download";
import { proxiedExternalImageUrl } from "@/lib/media/external-image";
import type { KindMediaKitCapabilities } from "./kind-action-context";
import { MAX_IMAGE_BYTES } from "./handlers/fetch-image";

async function fetchWebImage(url: string): Promise<Blob> {
  const response = await fetch(proxiedExternalImageUrl(url));
  if (!response.ok) throw new Error(`image door answered ${response.status}`);
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_IMAGE_BYTES) throw new Error("image too large");
  return response.blob();
}

export const mediaKitCapabilities: Required<KindMediaKitCapabilities> = {
  fetchImage: async (source) =>
    "url" in source ? fetchWebImage(source.url) : (await readSavedFile(source.fileId, { inline: true })).blob,
  downloadContent: (filename, content, mime) => saveToDevice(filename, content, mime),
  downloadSavedFile: (fileId, filename) =>
    downloadMediaSource({ kind: "file_id", fileId }, filename ?? undefined),
  printDocument: async (request) => {
    if ("markdown" in request) {
      const { printMarkdown } = await import("@ai-matrx/print/markdown");
      return printMarkdown(request.markdown, { title: request.title });
    }
    const [{ buildPrintDocument, openPrintWindow }, { sanitizePrintHtml }] = await Promise.all([
      import("@ai-matrx/print/core"),
      import("@ai-matrx/print/safe-html"),
    ]);
    return openPrintWindow(buildPrintDocument(sanitizePrintHtml(request.html), request.title), request.title);
  },
};
