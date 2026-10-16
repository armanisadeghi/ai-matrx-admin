// features/rich-document/actions/handlers/chat.ts
//
// Chat-turn doors that used to be hand-built buttons on the /chat assistant
// bar: "Continue in chat mode" (open this conversation in the full chat page
// from any embedded surface). Absent on the chat page itself.

import { MessageSquareShare } from "lucide-react";
import { selectReservedConversationId } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";
import { isChatRoutePath, resolveContinueInChatConversationId } from "@ai-matrx/chat/agents/components/messages-display/assistant/continue-in-chat";
import { getEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { chatStateOf } from "../utils";
import { registerActionIfAbsent } from "./register-if-absent";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";
import { openOutbound } from "@ai-matrx/kit/outbound";

function continueHref(ctx: RichDocumentActionContext): string | null {
  if (ctx.source.type !== "chat-message") return null;
  const requestId = ctx.source.streamRequestId ?? null;
  const state = chatStateOf(ctx, ["activeRequests"]);
  const reserved = requestId && state ? selectReservedConversationId(requestId)(state) : null;
  const id = resolveContinueInChatConversationId(
    ctx.source.conversationId,
    reserved,
  );
  return getEntityInfo("conversation").hrefFor?.(id) ?? null;
}

registerActionIfAbsent({
  id: "continue-in-chat",
  label: "Continue in chat mode",
  icon: MessageSquareShare,
  category: "share",
  supportedSources: ["chat-message"],
  renderSlot: "primary",
  order: 10,
  visible: (ctx) =>
    typeof window !== "undefined" &&
    !isChatRoutePath(window.location.pathname) &&
    continueHref(ctx) !== null,
  run: (ctx) => {
    const href = continueHref(ctx);
    if (href) openOutbound(href, "_blank", "noopener");
  },
});

