// features/rich-document/actions/handlers/edit.ts
//
// "Edit & resubmit" — a user turn's three-outcome editor. `edit`, `fork-at-message`,
// `fork-and-regenerate`, `delete-message` and `edit-history` are @ai-matrx/chat's own
// (registerChatMessageActions); this app's non-chat edit body is ./host-edit-bodies.

import { Edit, Send } from "lucide-react";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { createFullScreenEditorCallbackGroup } from "@/features/overlays/callbacks/fullScreenEditor";
import { registerActionIfAbsent } from "./register-if-absent";
import { chatExtensions, isChatUserMessage } from "../utils";
import { openStructuredRawViewer } from "@ai-matrx/chat/agents/components/messages-display/message-options/openAssistantMessageEditor";

/**
 * USER MESSAGES — edit the prompt and choose an outcome from the editor footer
 * (Save only / Save & resubmit / Fork & resubmit). The SAME three-outcome
 * editor as the inline UserActionBar pencil — one shared definition
 * (`USER_EDIT_ACTIONS` + `routeUserEditAction`). `onAction` rides the callback
 * group (a function can't travel through overlay data).
 */
registerActionIfAbsent({
  id: "edit-and-resubmit",
  writesSource: true,
  label: (ctx) =>
    chatExtensions(ctx)?.contentIsStructuredRaw
      ? "View raw content"
      : "Edit & resubmit",
  icon: Send,
  iconColor: "text-cyan-500 dark:text-cyan-400",
  category: "edit",
  supportedSources: ["chat-message"],
  renderSlot: "overflow",
  order: 0,
  visible: (ctx) => isChatUserMessage(ctx),
  run: async (ctx) => {
    ctx.onClose();
    if (ctx.source.type !== "chat-message") return;
    const ext = chatExtensions(ctx);
    const { conversationId, messageId } = ctx.source;
    const content = ext?.messageContent ?? ctx.content;
    if (ext?.contentIsStructuredRaw) {
      // Structured payload: faithful read-only raw view — the text editor
      // would save the JSON string back as a text block.
      const { openStructuredRawViewer } = await import(
        "@ai-matrx/chat/agents/components/messages-display/message-options/openAssistantMessageEditor"
      );
      openStructuredRawViewer(ctx.dispatch, {
        content,
        messageId,
        metadata: ctx.metadata,
      });
      return;
    }
    const { USER_EDIT_ACTIONS, routeUserEditAction } = await import(
      "@ai-matrx/chat/agents/components/messages-display/message-options/userEditActions"
    );
    const surfaceKey = ctx.surfaceKey;
    const { callbackGroupId } = createFullScreenEditorCallbackGroup({
      onAction: (actionId, newContent) =>
        routeUserEditAction(ctx.dispatch, {
          actionId,
          conversationId,
          messageId,
          newContent,
          surfaceKey,
        }),
    });
    ctx.dispatch(
      openOverlay({
        overlayId: "fullScreenEditor",
        instanceId: `user-edit-${messageId}`,
        data: {
          content,
          mode: "free",
          conversationId,
          messageId,
          callbackGroupId,
          primaryActions: USER_EDIT_ACTIONS,
          tabs: ["write", "matrx_split", "markdown", "wysiwyg", "preview"],
          initialTab: "matrx_split",
          analysisData: ctx.metadata ?? undefined,
          showCopyButton: true,
        },
      }),
    );
  },
});

/**
 * USER MESSAGES — fork at this question and REGENERATE its answer on the
 * branch (no edit). The shared `forkAndResubmitFromMessage` thunk means the
 * branch never dead-ends on an unanswered question.
 */
