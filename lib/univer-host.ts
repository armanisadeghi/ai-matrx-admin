"use client";

/**
 * The app's side of the Univer glue (`@ai-matrx/office/univer`): the four things the package cannot
 * own, stated once. Import this module (for its effect) from every place that mounts a Univer
 * editor or reaches the picture ports: the two editors, the file-action adapters and the
 * workbook import.
 */
import { configureUniverHost } from "@ai-matrx/office/univer";
import { getClaimsUser } from "@ai-matrx/auth";
import { mediaClient } from "@/features/files/media-client/client";
import { toast } from "@/lib/toast";
import { toast as uiToast } from "@/components/ui/use-toast";
import { useThemeMode } from "@/styles/themes/useThemeMode";
import { supabase } from "@/utils/supabase/client";

configureUniverHost({
  toast,
  async getSignedInUser() {
    const { data } = await getClaimsUser(supabase);
    const user = data?.user;
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? null, metadata: (user.user_metadata ?? {}) as Record<string, unknown> };
  },
  files: {
    async upload(file) {
      const { fileId } = await mediaClient.upload(file);
      return { fileId };
    },
    async getBlob(fileId) {
      return (await mediaClient.getBlob({ file_id: fileId })).blob;
    },
  },
  notifyUploadError(error) {
    uiToast({
      title: "Image not added",
      description: error instanceof Error ? error.message : "Upload failed",
      variant: "destructive",
    });
  },
  useThemeMode,
});
