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

import { BookmarkPlus, FilePen, Link2, MessageCircle, Wand2 } from "lucide-react";
import { registerActionIfAbsent } from "./register-if-absent";
import { applyToSourceReviewAction } from "@/features/overlays/openers/applyToSourceReview";
import { shortcutEditorWindowAction } from "@/features/overlays/openers/shortcutEditorWindow";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  putShortcutDraftSeed,
  shortcutSeedForMapping,
} from "@/features/agent-shortcuts/draft-seed";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";
import { applyTargetForConversation } from "@ai-matrx/rich-content/rich-document/review/applyTargets";
import {
  chatIds,
  chatStateOf,
  contentForDestination,
} from "../utils";

registerActionIfAbsent({
  id: "text-cleanup",
  writesSource: true,
  label: "Clean up",
  icon: Wand2,
  iconColor: "text-primary",
  category: "ai",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 0,
  visible: (ctx) => Boolean(ctx.callbacks?.onRequestTextAgentAction),
  run: (ctx) => ctx.callbacks?.onRequestTextAgentAction?.("cleanup", ctx),
});

registerActionIfAbsent({
  id: "text-help",
  writesSource: true,
  label: "Help with this…",
  icon: MessageCircle,
  iconColor: "text-primary",
  category: "ai",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 1,
  visible: (ctx) => Boolean(ctx.callbacks?.onRequestTextAgentAction),
  run: (ctx) => ctx.callbacks?.onRequestTextAgentAction?.("help", ctx),
});

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

// ── A good "Custom agent…" run, kept ───────────────────────────────────────
// The run's mapping (recorded on the conversation by the Custom Agent window)
// becomes a shortcut — its own menu item, its own window, usually one-shot —
// or a binding of the agent to this page (it joins the page's Agents menu
// and reads this page's own values).

function runMapping(ctx: RichDocumentActionContext) {
  if (
    ctx.extensions?.type !== "chat-message" ||
    ctx.extensions.role !== "assistant"
  ) {
    return null;
  }
  const { conversationId } = chatIds(ctx);
  if (!conversationId) return null;
  const conversation = chatStateOf(ctx, ["conversations"])?.conversations.byConversationId[conversationId];
  if (!conversation?.agentId || !conversation.launchMapping) return null;
  return { agentId: conversation.agentId, ...conversation.launchMapping };
}

registerActionIfAbsent({
  id: "save-run-as-shortcut",
  label: "Save as shortcut",
  icon: BookmarkPlus,
  iconColor: "text-primary",
  category: "ai",
  supportedSources: ["chat-message"],
  renderSlot: "overflow",
  order: 4,
  visible: (ctx) => runMapping(ctx) !== null,
  run: (ctx) => {
    const run = runMapping(ctx);
    if (!run) return;
    ctx.dispatch(
      shortcutEditorWindowAction({
        agentId: run.agentId,
        seedId: putShortcutDraftSeed(
          shortcutSeedForMapping(run.valueMappings, run.surfaceName),
        ),
      }),
    );
    ctx.onClose();
  },
});

registerActionIfAbsent({
  id: "bind-run-to-page",
  label: "Bind to this page",
  icon: Link2,
  iconColor: "text-primary",
  category: "ai",
  supportedSources: ["chat-message"],
  renderSlot: "overflow",
  order: 5,
  // Only a run captured on a registered page has a page to bind to.
  visible: (ctx) => Boolean(runMapping(ctx)?.surfaceName),
  run: (ctx) => {
    const run = runMapping(ctx);
    if (!run?.surfaceName) return;
    ctx.dispatch(
      openOverlay({
        overlayId: "surfaceAgentBindWindow",
        instanceId: `surfaceAgentBindWindow-${Date.now()}`,
        data: {
          surfaceName: run.surfaceName,
          initialAgentId: run.agentId,
          initialValueMappings: run.valueMappings,
        },
      }),
    );
    ctx.onClose();
  },
});
