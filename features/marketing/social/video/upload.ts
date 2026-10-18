/** Upload a file the brief names (a recording, a product photo, a music track) and read what the server needs about it. */

import { uploadFile } from "@/features/files/api/files";

import type { BriefFile } from "./clone";
import { contentHashOf } from "./studio-hooks";

function secondsOf(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = el.duration;
      URL.revokeObjectURL(el.src);
      resolve(Number.isFinite(d) ? Math.round(d * 1000) / 1000 : undefined);
    };
    el.onerror = () => resolve(undefined);
    el.src = URL.createObjectURL(file);
  });
}

export async function uploadBriefFile(file: File, folder: string): Promise<BriefFile> {
  const { data } = await uploadFile({ file, filePath: `${folder}/${Date.now()}-${file.name}` });
  const hash = contentHashOf(data.checksum);
  if (!hash) throw new Error("The upload has no content hash yet; try again.");
  const out: BriefFile = { fileId: data.file_id, contentHash: hash };
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
    const s = await secondsOf(file);
    if (s) out.durationSeconds = s;
  }
  return out;
}
