// features/rich-document/actions/handlers/share.ts
//
// Publishing actions that used to live only in the chat message menu
// (messageActionRegistry.ts, deleted in RC-B6). Source-agnostic: they publish
// what the reader sees; chat provenance rides along when the source is a chat
// message (the per-message idempotency key on the public page).

import { FileText } from "lucide-react";
import { toast } from "@/lib/toast";
import { registerActionIfAbsent } from "./register-if-absent";
import { deriveContentTitle, getErrorMessage, contentForDestination } from "../utils";
import { openOutbound } from "@ai-matrx/kit/outbound";

registerActionIfAbsent({
  /**
   * A REAL Google Doc, not a clipboard payload. Same one path every other
   * surface uses — `features/google-workspace/export/sendToGoogle.ts` — so the
   * registry owns no Google code of its own.
   */
  id: "send-google-doc",
  label: "Send to Google Doc",
  icon: FileText,
  iconColor: "text-blue-500 dark:text-blue-400",
  category: "share",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 1,
  run: async (ctx) => {
    try {
      const [{ sendContentToGoogleDoc }, { announceProposedGoogleWrite, isProposedGoogleWrite }] =
        await Promise.all([
          import("@/features/google-workspace/export/sendToGoogle"),
          import("@/features/google-workspace/export/proposedWrite"),
        ]);
      const result = await sendContentToGoogleDoc(
        contentForDestination(ctx),
        deriveContentTitle(ctx) ?? "AI Matrx message",
      );
      if (!result.ok && result.reason === "failed") {
        toast.error("Could not create the Google Doc", {
          description: result.message,
        });
        return;
      }
      // NOTHING WAS WRITTEN, and it is not a failure: the organization reviews
      // this kind of change first, so the server filed it in the approval
      // queue. ONE module owns those words for every call site (F-99).
      if (isProposedGoogleWrite(result)) {
        announceProposedGoogleWrite(result);
        return;
      }
      if (!result.ok) {
        toast.info("Connect Google to send this to a Doc", {
          description:
            "Takes about ten seconds, and only for files you choose or that we create.",
          action: {
            label: "Connect",
            onClick: () => openOutbound(result.settingsHref, "_blank", "noopener"),
          },
        });
        return;
      }
      toast.success(`Created "${result.name}" in your Google Drive`, {
        action: result.openUrl
          ? {
              label: "Open",
              onClick: () =>
                openOutbound(result.openUrl as string, "_blank", "noopener"),
            }
          : undefined,
      });
      ctx.onClose();
    } catch (err) {
      toast.error("Could not create the Google Doc", {
        description: getErrorMessage(err, "Unknown error"),
      });
    }
  },
});
