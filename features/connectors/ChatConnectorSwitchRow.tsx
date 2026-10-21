"use client";

// features/connectors/ChatConnectorSwitchRow.tsx
//
// "IN THIS CHAT" on a connector's detail page, when the Browse window was opened FROM a chat (defect I,
// round 2). It flips the SAME setting the chat's + menu row flips (`useChatConnectorSwitch`), so the
// window and the chat are one: turn it on here and the menu shows it on; turn it off in the menu and
// this shows it off.

import { Switch } from "@ai-matrx/design-system/controls";
import { useChatConnectorSwitch } from "@ai-matrx/chat/agents/hooks/useChatConnectorSwitch";
import type { ChatSwitchTarget } from "./chat-switch-target";
import { GOOGLE_CHAT_TOOL_NAMES } from "./google-chat-connector";

const GOOGLE_TOOLS = { chatToolNames: GOOGLE_CHAT_TOOL_NAMES };

export function ChatConnectorSwitchRow({
  conversationId,
  target,
}: {
  conversationId: string;
  target: ChatSwitchTarget;
}) {
  const chat = useChatConnectorSwitch(conversationId);
  // Nothing to switch before it is connected: connecting it from here joins the chat on its own.
  if (target.state === "none") return null;
  if (target.state === "attention") {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
        Reconnect it to use it in this chat.
      </div>
    );
  }
  const locked = target.kind === "mcp" && chat.mcpLocked(target.slug);
  const on = target.kind === "mcp" ? chat.mcpOn(target.slug) : chat.firstPartyOn(GOOGLE_TOOLS);
  return (
    <div
      data-chat-connector-switch={target.kind === "mcp" ? target.slug : "google"}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
    >
      <span className="text-sm text-foreground">In this chat</span>
      <Switch
        checked={on}
        disabled={locked}
        title={locked ? "Part of this agent — it rides every run" : undefined}
        onCheckedChange={(next: boolean) =>
          target.kind === "mcp" ? chat.setMcpOn(target.slug, next) : chat.setFirstPartyOn(GOOGLE_TOOLS, next)
        }
        aria-label="In this chat"
      />
    </div>
  );
}
