"use client";

// What the frame host hands its lazily loaded side chat (FrameSideChat): the page, the person's
// composer mode, and the open / closed state the host owns (the Side Chat's one rule and cookie,
// `@ai-matrx/chat/canvas/workspace/side-chat-state`). Tiny and eager; the chat itself is not here.
import { createContext, useContext } from "react";
import type { ComposerMode } from "@ai-matrx/chat/agents/components/inputs/smart-input/composer/composer-types";

export interface FrameSideChatHost {
  signedIn: boolean;
  initialPathname: string;
  initialMode: ComposerMode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FrameSideChatHostContext = createContext<FrameSideChatHost | null>(null);

export function useFrameSideChatHost(): FrameSideChatHost {
  const host = useContext(FrameSideChatHostContext);
  if (!host) throw new Error("[frame-host] FrameSideChat rendered outside FrameHostImpl's FrameSideChatHostContext");
  return host;
}
