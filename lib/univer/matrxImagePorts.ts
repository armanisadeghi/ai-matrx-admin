import { mediaClient } from "@/features/files/media-client/client";
import { toast } from "@/components/ui/use-toast";
import {
  isMatrxImageSource,
  matrxImageFileId,
  type ImageStorePorts,
} from "@/lib/univer/univerImageStore";

/** The real file-store ports: upload, read back as a blob, tell the person on failure. */
export const matrxImagePorts: ImageStorePorts = {
  async upload(file) {
    const { fileId } = await mediaClient.upload(file);
    return { fileId };
  },
  async getBlob(fileId) {
    return (await mediaClient.getBlob({ file_id: fileId })).blob;
  },
  onUploadError(error) {
    toast({
      title: "Image not added",
      description: error instanceof Error ? error.message : "Upload failed",
      variant: "destructive",
    });
  },
};

/** Export: a snapshot picture source (`matrx-file:<id>` or a URL) as bytes + type, or null if unreadable. */
export async function resolveExportImage(
  source: string,
): Promise<{ bytes: Uint8Array; extension: "png" | "jpeg" | "gif" } | null> {
  let blob: Blob;
  if (isMatrxImageSource(source)) {
    blob = (await mediaClient.getBlob({ file_id: matrxImageFileId(source) })).blob;
  } else {
    const res = await fetch(source);
    if (!res.ok) return null;
    blob = await res.blob();
  }
  const extension = blob.type.includes("gif") ? "gif" : blob.type.includes("png") ? "png" : "jpeg";
  return { bytes: new Uint8Array(await blob.arrayBuffer()), extension };
}

/** Import: store a picture from a file, return its file id. */
export async function uploadImportedImage(bytes: Uint8Array, extension: string): Promise<string> {
  const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
  const { fileId } = await mediaClient.upload(new File([bytes as BlobPart], `image.${extension}`, { type: mime }));
  return fileId;
}
