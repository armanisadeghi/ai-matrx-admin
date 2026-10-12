/**
 * Thumbnail capture: the snapshot miniature (snapshot-preview-svg) rasterised
 * to a PNG in the browser and stored through the ONE file client. The stored
 * file id is the template's durable thumbnail ref.
 */
import { mediaClient } from "@/features/files/media-client/client";
import type { TemplateKind, TemplateLane } from "../types";
import { THUMB_HEIGHT, THUMB_WIDTH, snapshotPreviewSvg } from "./snapshot-preview-svg";

const PIXEL_RATIO = 2;

export async function svgToPngBlob(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("The template preview could not be drawn."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_WIDTH * PIXEL_RATIO;
    canvas.height = THUMB_HEIGHT * PIXEL_RATIO;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("The template preview could not be drawn (no canvas).");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The template preview could not be encoded."))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderAndStoreThumbnail(
  kind: TemplateKind,
  snapshot: unknown,
  lane: TemplateLane,
  templateId: string,
): Promise<string> {
  const png = await svgToPngBlob(snapshotPreviewSvg(kind, snapshot));
  // One file per template: a shared name would land every thumbnail on the same path.
  const file = new File([png], `template-${templateId}.png`, { type: "image/png" });
  const shared = lane === "featured" || lane === "community";
  const { fileId } = await mediaClient.upload(file, {
    fileName: file.name,
    mimeType: "image/png",
    ...(shared ? { publishedToWeb: true } : { shownTo: lane === "mine" ? "only_me" : "everyone" }),
    metadata: { purpose: "file_template_thumbnail", template_id: templateId },
  });
  return fileId;
}
