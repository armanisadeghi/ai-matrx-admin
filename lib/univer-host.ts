"use client";

/**
 * The app's side of the Univer glue (`@ai-matrx/office/univer`): the four things the package cannot
 * own, stated once. Import this module (for its effect) from every place that mounts a Univer
 * editor or reaches the picture ports: the two editors, the file-action adapters and the
 * workbook import.
 */
import { configureUniverHost } from "@ai-matrx/office/univer";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
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
  async readNewestWorkbookSnapshot(workbookId) {
    const { data, error } = await supabase
      .schema("workbench")
      .from("udt_workbook_snapshots")
      // component-created-by-ok: append-only snapshot with NO updated_by column and NO parent-rewrite trigger — created_by is the author the client wrote at insert (the only person field this table has)
      .select("id, created_by, created_at")
      .eq("workbook_id", workbookId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { data, error: error ? { message: error.message } : null };
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
