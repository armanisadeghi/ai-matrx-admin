// features/rich-document/actions/handlers/ai.ts
//
// A text field's own AI powers — Clean up, Help with this, Custom agent — as
// registry actions, so a text field and a rendered document draw from ONE
// action layer. Clean up / Help produce a result the reader reviews and
// APPLIES back into the text, so only a host that can apply supplies
// `callbacks.onRequestTextAgentAction`: ProTextarea (applies into the field)
// and every WRITABLE document (the review-and-apply view). Custom agent opens
// the chosen agent in its own window on any text; when the text is writable
// its answers offer "Apply to source" (the same review).

import { FilePen } from "lucide-react";
import { registerActionIfAbsent } from "./register-if-absent";
import { applyToSourceReviewAction } from "@/features/overlays/definitions/applyToSourceReview.overlay";
import { applyTargetForConversation } from "@ai-matrx/rich-content/rich-document/review/applyTargets";
import { chatIds, contentForDestination } from "../utils";

registerActionIfAbsent({
  // An answer in an agent window launched by "Custom agent…" from text that
  // can be saved: review it against that text and apply (the one review —
  // diff, splice, save through the source's adapter).
  id: "apply-to-source",
  label: "Apply to source",
  icon: FilePen,
  iconColor: "text-primary",
  category: "ai",
  supportedSources: ["chat-message"],
  renderSlot: "overflow",
  order: 3,
  visible: (ctx) =>
    ctx.extensions?.type === "chat-message" &&
    ctx.extensions.role === "assistant" &&
    applyTargetForConversation(chatIds(ctx).conversationId) !== null,
  run: (ctx) => {
    const target = applyTargetForConversation(chatIds(ctx).conversationId);
    if (!target) return;
    ctx.dispatch(
      applyToSourceReviewAction({
        applyTargetId: target.id,
        proposal: contentForDestination(ctx),
      }),
    );
    ctx.onClose();
  },
});

// "Bind to this page" (a kept Custom agent run) moved into @ai-matrx/chat (message-actions W3c).
