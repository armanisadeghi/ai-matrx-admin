/**
 * ONE RIGHT-CLICK MENU FOR EVERY HOST (chat parity W3b, 2026-10-16).
 *
 * The chat transcript (package code, AgentConversationDisplay) draws its right-click through the
 * chat's `NonEditableContextMenu` slot with `menuDesign="global"`. The web registers the
 * @ai-matrx/context-menu engine's component there, and so does Matrx 2
 * (matrx-desktop app/renderer/src/cloud-chat/context-menu.ts, guarded by its
 * test/renderer/cloud-chat-context-menu.test.ts). Both hosts therefore build the same designed
 * tree. This is red if the web swaps in any other right-click component.
 */
import { NonEditableContextMenu as ChatSlotMenu } from "@ai-matrx/chat/host/ui-slots";
import { NonEditableContextMenu as EngineMenu } from "@ai-matrx/context-menu/react";

test("the web's chat right-click slot is the context-menu engine's component", () => {
  require("@/providers/chatUiRegistration");
  const el = (ChatSlotMenu as unknown as (p: object) => { props: { children: { type: unknown } } })({ children: null });
  expect(el.props.children.type).toBe(EngineMenu);
});
