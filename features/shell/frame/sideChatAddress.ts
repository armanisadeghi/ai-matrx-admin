// THE SIDE CHAT'S ADDRESS, read and written with no chat code on the page.
//
// The contract lives in @ai-matrx/chat (`canvas/workspace/side-chat-address.ts`: side_chat,
// side_chat_agent, side_chat_mode). Importing it would load the chat and agents packages on
// every page before anyone opens the side chat, so the frame carries this small reading of the
// panel's open / closed half; a test (`__tests__/side-chat-address.test.ts`) holds it to the
// package's own answers. Everything else in the link (which conversation, agent, mode) is the
// side chat's to read once it has loaded.

import { isUuidShape } from "@ai-matrx/kit/uuid";
export const SIDE_CHAT_PARAM = "side_chat";
export const SIDE_CHAT_AGENT_PARAM = "side_chat_agent";
export const SIDE_CHAT_MODE_PARAM = "side_chat_mode";


/** What the address says about the side chat: true open, false closed, null nothing. */
export function sideChatOpenFromAddress(search: string): boolean | null {
  const params = new URLSearchParams(search);
  const agent = params.get(SIDE_CHAT_AGENT_PARAM);
  // A named agent opens the chat (the package warns and ignores a malformed one).
  if (agent !== null && (isUuidShape(agent) || /^mandate:[a-z0-9][a-z0-9_.:-]*$/i.test(agent))) return true;
  const chat = params.get(SIDE_CHAT_PARAM);
  if (chat === "open" || chat === "new" || (chat !== null && isUuidShape(chat))) return true;
  if (chat === "closed") return false;
  return null;
}

/**
 * The address after the person opens or closes the side chat with no conversation yet: the
 * one-shot params go; `side_chat=open` stays only where it already said so; a closed panel
 * drops the param unless the link itself said closed.
 */
export function sideChatAddressFor(search: string, open: boolean): string {
  const params = new URLSearchParams(search);
  const current = params.get(SIDE_CHAT_PARAM);
  params.delete(SIDE_CHAT_AGENT_PARAM);
  params.delete(SIDE_CHAT_MODE_PARAM);
  if (open) {
    if (current === "open") params.set(SIDE_CHAT_PARAM, "open");
    else params.delete(SIDE_CHAT_PARAM);
  } else if (current !== "closed") params.delete(SIDE_CHAT_PARAM);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
