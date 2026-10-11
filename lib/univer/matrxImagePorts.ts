import { mediaClient } from "@/features/files/media-client/client";
import { toast } from "@/components/ui/use-toast";
import type { ImageStorePorts } from "@/lib/univer/univerImageStore";

/** The real file-store ports: upload, read back as an object URL, tell the person on failure. */
export const matrxImagePorts: ImageStorePorts = {
  async upload(file) {
    const { fileId } = await mediaClient.upload(file);
    return { fileId };
  },
  async getBlobUrl(fileId) {
    const handle = await mediaClient.getBlob({ file_id: fileId });
    return handle.url;
  },
  onUploadError(error) {
    toast({
      title: "Image not added",
      description: error instanceof Error ? error.message : "Upload failed",
      variant: "destructive",
    });
  },
};
