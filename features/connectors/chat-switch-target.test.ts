/**
 * WHICH CHAT SWITCH A DIRECTORY CARD CONTROLS (defect I, round 2): the Browse window opened from a chat
 * offers "In this chat" on a connector's detail, and it must flip the setting the + menu row flips.
 * Mutation: key a native card by its own id instead of the catalog connector it folds in, and the
 * Microsoft / Slack cases go RED.
 */
import type { McpCatalogEntry } from "@ai-matrx/chat/agents/types/mcp.types";
import { chatSwitchTargetFor } from "./chat-switch-target";
import type { IntegrationDirectoryItem } from "./integration-directory";

function card(over: Partial<IntegrationDirectoryItem> & Pick<IntegrationDirectoryItem, "id">): IntegrationDirectoryItem {
  return {
    name: over.id,
    description: "",
    vendor: "",
    category: "productivity",
    keywords: "",
    artwork: { id: over.id, name: over.id, blurb: "", surfaces: ["directory"] },
    featured: false,
    saved: false,
    connected: false,
    available: true,
    comingSoon: false,
    status: "Not connected",
    attention: false,
    ...over,
  };
}
const server = (slug: string) => ({ slug }) as McpCatalogEntry;

describe("chatSwitchTargetFor", () => {
  it("a catalog connector's card switches that MCP connector", () => {
    expect(chatSwitchTargetFor(card({ id: "s1", server: server("linear"), connected: true }))).toEqual({ kind: "mcp", slug: "linear", state: "connected" });
  });

  it("a card needing repair says so instead of offering a switch that cannot work", () => {
    expect(chatSwitchTargetFor(card({ id: "s1", server: server("linear"), saved: true, attention: true }))).toEqual({ kind: "mcp", slug: "linear", state: "attention" });
  });

  it("a connector nobody connected has nothing to switch yet", () => {
    expect(chatSwitchTargetFor(card({ id: "s1", server: server("linear") }))?.state).toBe("none");
  });

  it("Google's card switches Google's tools", () => {
    expect(chatSwitchTargetFor(card({ id: "native:google", connected: true }))).toEqual({ kind: "google", state: "connected" });
  });

  it("GitHub's native card switches the github connector", () => {
    expect(chatSwitchTargetFor(card({ id: "native:github", connected: true }))).toEqual({ kind: "mcp", slug: "github", state: "connected" });
  });

  it("a native card that folds in ONE catalog connector switches that connector, by its state", () => {
    const microsoft = card({
      id: "native:microsoft",
      abilities: [{ label: "Work insights", item: card({ id: "wiq", server: server("microsoft-work-iq"), connected: true }) }],
    });
    expect(chatSwitchTargetFor(microsoft)).toEqual({ kind: "mcp", slug: "microsoft-work-iq", state: "connected" });
  });

  it("a native card with no catalog connector behind it has no chat switch", () => {
    expect(chatSwitchTargetFor(card({ id: "native:x" }))).toBeNull();
    expect(chatSwitchTargetFor(card({ id: "native:api-keys" }))).toBeNull();
  });
});
