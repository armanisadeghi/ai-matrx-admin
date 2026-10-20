/**
 * The frame's small reading of the side chat's address (../sideChatAddress.ts) must give the
 * same answers as the contract's home, @ai-matrx/chat's side-chat-address. The frame carries a
 * copy only so a page loads no chat code before the side chat opens; this keeps the copy honest.
 */
import { readSideChatLink, sideChatAddress } from "@ai-matrx/chat/canvas/workspace/side-chat-address";
import { sideChatAddressFor, sideChatOpenFromAddress } from "../sideChatAddress";

const UUID = "3f2a9c1e-8b4d-4e2f-9a1b-7c6d5e4f3a2b";
const SEARCHES = [
  "",
  "?a=1",
  "?side_chat=open",
  "?side_chat=closed",
  "?side_chat=new",
  `?side_chat=${UUID}`,
  "?side_chat=nonsense",
  `?side_chat_agent=${UUID}`,
  "?side_chat_agent=mandate:chat.default_new_chat",
  "?side_chat_agent=bad value",
  "?side_chat=closed&side_chat_agent=mandate:x.y",
  "?side_chat_mode=work",
  "?side_chat=open&side_chat_mode=advanced&b=2",
];

const quiet = () => {};

describe("the frame's side chat address matches @ai-matrx/chat", () => {
  it.each(SEARCHES)("reads %s the same way", (search) => {
    expect(sideChatOpenFromAddress(search)).toBe(readSideChatLink(search, quiet)?.open ?? null);
  });

  it.each(SEARCHES.flatMap((s) => [[s, true] as const, [s, false] as const]))(
    "writes %s (open=%s) the same way",
    (search, open) => {
      expect(sideChatAddressFor(search, open)).toBe(
        sideChatAddress(search, { conversationId: null, open, hostedElsewhere: false }),
      );
    },
  );
});
