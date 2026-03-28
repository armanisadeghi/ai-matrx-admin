// app/(ssr)/ssr/chat/page.tsx
//
// Root chat route — renders the default agent welcome screen directly.
// Avoids a redirect round-trip so the layout renders without an error flash.

import ChatWelcomeServer from "./_components/ChatWelcomeServer";
import ChatHeaderControls from "./_components/ChatHeaderControls";
import { MATRX_CHAT_AGENT } from "./_lib/agents";
import { getChatAuth } from "./_lib/auth";
import { BACKEND_URLS, ENDPOINTS } from "@/lib/api/endpoints";

export default async function ChatPage() {
  const auth = await getChatAuth();

  fetch(
    `${BACKEND_URLS.production}${ENDPOINTS.ai.agentWarm(MATRX_CHAT_AGENT.promptId)}`,
    {
      method: "POST",
    },
  ).catch(() => {});

  return (
    <>
      <ChatHeaderControls />
      <ChatWelcomeServer
        agent={MATRX_CHAT_AGENT}
        isAuthenticated={auth.isAuthenticated}
        isAdmin={auth.isAdmin}
      />
    </>
  );
}
