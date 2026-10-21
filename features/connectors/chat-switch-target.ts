// features/connectors/chat-switch-target.ts
//
// WHICH CHAT SWITCH A DIRECTORY CARD CONTROLS (defect I, round 2). The Browse window opened from a
// chat offers "In this chat" on each connector's detail; this says what that switch flips — an MCP
// connector (`addedMcpServers`) or Google (its tool names in `removedTools`) — and whether it can be
// flipped yet. Pure, over the card the directory already built, so the card's own state and the
// switch's can never disagree.

import type { IntegrationDirectoryItem } from "./integration-directory";

export type ChatSwitchState = "connected" | "attention" | "none";

export type ChatSwitchTarget =
  | { kind: "mcp"; slug: string; state: ChatSwitchState }
  | { kind: "google"; state: ChatSwitchState };

function stateOf(item: Pick<IntegrationDirectoryItem, "connected" | "attention">): ChatSwitchState {
  if (item.attention) return "attention";
  return item.connected ? "connected" : "none";
}

/** Native cards whose chat connector is a catalog slug of its own (GitHub has no catalog card). */
const NATIVE_CARD_SLUG: Readonly<Record<string, string>> = { "native:github": "github" };

export function chatSwitchTargetFor(item: IntegrationDirectoryItem): ChatSwitchTarget | null {
  if (item.server) return { kind: "mcp", slug: item.server.slug, state: stateOf(item) };
  if (item.id === "native:google") return { kind: "google", state: stateOf(item) };
  const slug = NATIVE_CARD_SLUG[item.id];
  if (slug) return { kind: "mcp", slug, state: stateOf(item) };
  // A native card that folds in exactly one catalog connector (Notion, Slack, Microsoft…): that
  // connector is what a chat can switch on; the card's own connection is not a chat connector.
  const catalog = (item.abilities ?? []).flatMap((ability) =>
    ability.item.server ? [{ slug: ability.item.server.slug, item: ability.item }] : [],
  );
  if (catalog.length === 1) {
    return { kind: "mcp", slug: catalog[0].slug, state: stateOf(catalog[0].item) };
  }
  return null;
}
