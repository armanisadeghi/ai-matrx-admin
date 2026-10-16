// features/rich-document/actions/handlers/capture.ts
//
// Add to Rulebook, Set Context Value and Save as Message Template moved into @ai-matrx/chat
// (message-actions W3c). Capture actions that used to live ONLY in the chat message menu
// (messageActionRegistry.ts, deleted in RC-B6). Each is source-agnostic: the
// content is whatever the reader sees (`ctx.content`), and chat provenance
// (conversation / message ids, the "{conversation} Message {n}" title) rides
// along when the source is a chat message. Heavy services load inside the
// handler (code-splitting rule 6 — this module is reachable from every
// RichDocument surface).

import { durableRecordId } from "@ai-matrx/kit/ids";
import { Boxes } from "lucide-react";
import { toast } from "@/lib/toast";
import { messageMayContainKindBlock } from "@/features/content-ir/studio/message-kind-gate";
import { registerActionIfAbsent } from "./register-if-absent";
import { chatIds, getErrorMessage, contentForDestination } from "../utils";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { openOutbound } from "@ai-matrx/kit/outbound";

registerActionIfAbsent({
  // "Save to my Shapes": persist a registered `__kind` block from this content
  // as a `content_ir.kind_instance` row. Hot-path gate is CHEAP by design (a
  // marker substring check); the heavy extraction lazy-loads on click.
  // Unregistered kinds surface an honest error toast, never a write.
  id: "save-shape-instance",
  label: "Save to my Shapes",
  icon: Boxes,
  iconColor: "text-primary",
  category: "save",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 13,
  requiresAuth: true,
  visible: (ctx) => messageMayContainKindBlock(ctx.content),
  run: async (ctx) => {
    ctx.onClose();
    // THE EXPLICIT ACTIVE ORG, NEVER A PERSONAL SUBSTITUTE — the gate asks
    // instead of guessing; cancelling writes nothing and says nothing.
    let organizationId: string;
    try {
      organizationId = await ensureOrgId(ctx.organizationId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save to Shapes"));
      return;
    }
    const { conversationId, messageId } = chatIds(ctx);
    const toastId = toast.loading("Saving shape instance…");
    try {
      const { saveKindInstancesFromMessage } = await import(
        "@/features/content-ir/studio/message-kind-instances"
      );
      const { shapeInstancesHref } = await import(
        "@/features/content-ir/studio/constants"
      );
      const saved = await saveKindInstancesFromMessage({
        text: contentForDestination(ctx),
        organizationId,
        // Provenance rides with the save (DD-131 slice 1): HOMED in this
        // conversation with a `produced_by` edge back to this message.
        conversationId,
        // A client-temp answer has no row for the `produced_by` edge.
        messageId: durableRecordId(messageId),
      });
      const drifted = saved.filter((s) => s.validationStatus !== "passed");
      if (drifted.length > 0) {
        toast.error(
          `Saved ${saved.length} instance${saved.length === 1 ? "" : "s"}, but ${drifted.length} did not pass validation`,
          {
            id: toastId,
            description: drifted
              .map((s) => `${s.label}: ${s.validationStatus}`)
              .join("; "),
          },
        );
        return;
      }
      const first = saved[0];
      const unlinked = saved.filter((entry) => entry.provenanceWarning);
      if (unlinked.length > 0) {
        toast.warning(
          `Saved ${saved.length} instance${saved.length === 1 ? "" : "s"}, but the link back to this message was not written`,
          { id: toastId, description: unlinked[0].provenanceWarning ?? "" },
        );
        return;
      }
      toast.success(
        saved.length === 1
          ? first.title
            ? `Saved "${first.title}" to your Shapes`
            : `Saved a ${first.label} instance`
          : `Saved ${saved.length} instances to your Shapes`,
        {
          id: toastId,
          description: `${first.label} v${first.kindVersion} — validation passed.`,
          action: {
            label: "View in Instances",
            onClick: () =>
              openOutbound(
                `${shapeInstancesHref(first.kind)}?i=${first.id}`,
                "_blank",
                "noopener",
              ),
          },
        },
      );
    } catch (err) {
      toast.error("Failed to save to Shapes", {
        id: toastId,
        description: getErrorMessage(err, "Unknown error"),
      });
    }
  },
});

