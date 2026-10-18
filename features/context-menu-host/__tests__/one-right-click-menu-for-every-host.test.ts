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
import { NonEditableContextMenuSlot as ChatSlotMenu } from "@ai-matrx/chat/host/ui-slots";
import { NonEditableContextMenu as EngineMenu } from "@ai-matrx/context-menu/react";

test("the web's chat right-click slot is the context-menu engine's component", () => {
  require("@/providers/chatUiRegistration");
  const el = (ChatSlotMenu as unknown as (p: object) => { props: { children: { type: unknown } } })({ children: null });
  expect(el.props.children.type).toBe(EngineMenu);
});

/**
 * …and an ANSWER's right-click is the same component (chat parity W3c). The answer draws through
 * rich-content's RegistryContextMenu, which asks rich-content's own `NonEditableContextMenu`
 * binding; the web binds the engine there (features/rich-content-host/app-bindings.tsx), Matrx 2
 * gets it from the chat package's bare-host defaults forwarding to the chat slot (guarded in
 * @ai-matrx/chat an-answer-right-click-is-the-hosts-one-menu). Red if the web binds anything else.
 */
test("the web's answer right-click binding is the context-menu engine's component", () => {
  require("@/features/rich-content-host/app-bindings");
  const { NonEditableContextMenu: AnswerMenu } = require("@ai-matrx/rich-content/host/app-bindings") as {
    NonEditableContextMenu: (p: object) => { type: unknown };
  };
  expect(AnswerMenu({ children: null }).type).toBe(EngineMenu);
});
