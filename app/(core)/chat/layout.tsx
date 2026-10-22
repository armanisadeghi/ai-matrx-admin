import { createRouteMetadata } from "@/utils/route-metadata";
import { ChatIncognitoProvider } from "@ai-matrx/chat/agents/components/chat/ChatIncognitoProvider";
import { ChatIncognitoHeaderButton } from "@ai-matrx/chat/agents/components/chat/ChatIncognitoHeaderButton";
import { ChatRouteSeedStart } from "@ai-matrx/chat/agents/components/chat/ChatRouteSeedStart";
import { ChatPasteOffer } from "@/features/data-sources/ChatPasteOffer";
import { ChatFreshRoutePrefetch } from "@/components/warmup/ChatFreshRoutePrefetch";

export const metadata = createRouteMetadata("/chat", {
  title: "Chat",
  description:
    "Chat with your agents, system agents, and community agents — a unified conversational surface.",
  letter: "C",
  additionalMetadata: {
    keywords: [
      "AI chat",
      "agent chat",
      "conversational AI",
      "AI assistant",
      "AI Matrx",
    ],
  },
});

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatIncognitoProvider>
      {/* /chat's first paint in ONE read: sent from the route root, before the page or the
          lazily imported sidebar menu asks for its rows (history, pinned, model pill). */}
      <ChatRouteSeedStart />
      <ChatIncognitoHeaderButton />
      <ChatPasteOffer />
      <ChatFreshRoutePrefetch />
      {children}
    </ChatIncognitoProvider>
  );
}
