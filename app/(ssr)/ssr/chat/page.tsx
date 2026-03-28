// app/(ssr)/ssr/chat/page.tsx
//
// Root chat route — renders the default agent welcome screen directly.
// Avoids a redirect round-trip so the layout renders without an error flash.

import ChatWelcomeServer from "@/features/cx-chat/components/ChatWelcomeServer";
import ChatHeaderControls from "@/features/cx-chat/components/ChatHeaderControls";
import { getDefaultAgent } from "@/features/cx-chat/lib/agents";
import { BACKEND_URLS, ENDPOINTS } from "@/lib/api/endpoints";

export default async function ChatPage() {
  fetch(
    `${BACKEND_URLS.production}${ENDPOINTS.ai.agentWarm(getDefaultAgent().promptId)}`,
    {
      method: "POST",
    },
  ).catch(() => {});

  return (
    <>
      <ChatHeaderControls />
      <ChatWelcomeServer agent={getDefaultAgent()} />
    </>
  );
}
