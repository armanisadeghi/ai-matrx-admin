/**
 * "IN THIS CHAT" ON A CONNECTOR'S DETAIL (defect I, round 2): the Browse window opened from a chat flips
 * the SAME setting the + menu flips. The chat package's one switch (`useChatConnectorSwitch`) is the
 * double here; the row's wiring is what is under test.
 * Mutation: flip Google through `setMcpOn`, or show a switch before it is connected, and it goes RED.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSwitch = {
  mcpOn: jest.fn(),
  mcpLocked: jest.fn(),
  setMcpOn: jest.fn(),
  firstPartyOn: jest.fn(),
  setFirstPartyOn: jest.fn(),
};
jest.mock("@ai-matrx/chat/agents/hooks/useChatConnectorSwitch", () => ({ useChatConnectorSwitch: () => mockSwitch }));

import { ChatConnectorSwitchRow } from "../ChatConnectorSwitchRow";
import { GOOGLE_CHAT_TOOL_NAMES } from "../google-chat-connector";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.values(mockSwitch).forEach((fn) => fn.mockReset());
  mockSwitch.mcpOn.mockReturnValue(false);
  mockSwitch.mcpLocked.mockReturnValue(false);
  mockSwitch.firstPartyOn.mockReturnValue(true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const toggle = () => container.querySelector<HTMLButtonElement>('[role="switch"]');

it("flips an MCP connector in this chat", async () => {
  await act(async () => root.render(<ChatConnectorSwitchRow conversationId="chat-1" target={{ kind: "mcp", slug: "linear", state: "connected" }} />));
  expect(container.textContent).toContain("In this chat");
  await act(async () => toggle()?.click());
  expect(mockSwitch.setMcpOn).toHaveBeenCalledWith("linear", true);
});

it("flips Google by its tools, never as an MCP connector", async () => {
  await act(async () => root.render(<ChatConnectorSwitchRow conversationId="chat-1" target={{ kind: "google", state: "connected" }} />));
  await act(async () => toggle()?.click());
  expect(mockSwitch.setFirstPartyOn).toHaveBeenCalledWith({ chatToolNames: GOOGLE_CHAT_TOOL_NAMES }, false);
  expect(mockSwitch.setMcpOn).not.toHaveBeenCalled();
});

it("an agent's own connector is on and cannot be switched off here", async () => {
  mockSwitch.mcpOn.mockReturnValue(true);
  mockSwitch.mcpLocked.mockReturnValue(true);
  await act(async () => root.render(<ChatConnectorSwitchRow conversationId="chat-1" target={{ kind: "mcp", slug: "linear", state: "connected" }} />));
  expect(toggle()?.hasAttribute("disabled")).toBe(true);
});

it("offers no switch before it is connected, and says to reconnect when it needs repair", async () => {
  await act(async () => root.render(<ChatConnectorSwitchRow conversationId="chat-1" target={{ kind: "mcp", slug: "linear", state: "none" }} />));
  expect(container.textContent).toBe("");
  await act(async () => root.render(<ChatConnectorSwitchRow conversationId="chat-1" target={{ kind: "mcp", slug: "linear", state: "attention" }} />));
  expect(toggle()).toBeNull();
  expect(container.textContent).toContain("Reconnect");
});
