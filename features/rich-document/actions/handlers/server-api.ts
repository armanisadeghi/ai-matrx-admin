// features/rich-document/actions/handlers/server-api.ts
//
// The one admin "(server)" message row still in this app: "Replace this with a summary… (server)"
// opens this app's full-screen editor overlay (a host window; W2 moves it onto the package's
// opener). The other seven "(server)" rows are @ai-matrx/chat's (message-actions W1b).

import { Scissors } from "lucide-react";
import { toast } from "@/lib/toast";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { createFullScreenEditorCallbackGroup } from "@/features/overlays/callbacks/fullScreenEditor";
import { registerActionIfAbsent } from "./register-if-absent";
import { getErrorMessage } from "../utils";

registerActionIfAbsent({
  id: "server-api-admin-replace-with-summary",
  label: "Replace this with a summary… (server)",
  icon: Scissors,
  iconColor: "text-blue-500 dark:text-blue-400",
  category: "admin",
  writesSource: true,
  supportedSources: ["chat-message"],
  renderSlot: "overflow",
  order: 6,
  visible: (ctx) => ctx.isAdmin,
  run: (ctx) => {
    if (ctx.source.type !== "chat-message") return;
    const { conversationId, messageId } = ctx.source;
    // Custom server save (replaceMessages) → route onSave via the callback
    // registry; a function can't survive Redux. The bridge closes itself and
    // the group auto-disposes on save.
    const { callbackGroupId } = createFullScreenEditorCallbackGroup({
      onSave: async (newContent: string) => {
        const trimmed = newContent.trim();
        if (!trimmed) {
          toast.error("Summary text required");
          throw new Error("Summary text required");
        }
        try {
          const { replaceMessages } = await import(
            "@ai-matrx/chat/agents/redux/execution-system/message-crud/server/replace-messages.thunk"
          );
          await ctx
            .dispatch(
              replaceMessages({
                conversationId,
                selector: {
                  message_ids: [messageId],
                  inclusive: true,
                },
                summaryContent: [{ type: "text", text: trimmed }],
              }),
            )
            .unwrap();
          toast.success("Replaced with summary (server)");
        } catch (err) {
          toast.error(getErrorMessage(err, "Replace-with-summary failed"));
          throw err;
        }
      },
    });
    ctx.dispatch(
      openOverlay({
        overlayId: "fullScreenEditor",
        instanceId: ctx.instanceKey("srv-replace"),
        data: {
          content: "",
          mode: "free",
          messageId,
          callbackGroupId,
          tabs: ["write", "matrx_split", "markdown", "preview"],
          initialTab: "write",
          title: "Summary content",
          showSaveButton: true,
          showCopyButton: false,
        },
      }),
    );
  },
});
