// app/(ssr)/ssr/chat/page.tsx — Root chat route (default agent welcome screen).

import ChatHeaderControls from "@/features/cx-chat/components/ChatHeaderControls";
import ChatWelcomeServer from "@/features/cx-chat/components/ChatWelcomeServer";
import { getDefaultAgent } from "@/features/cx-chat/components/agent/agents";
import { BACKEND_URLS, ENDPOINTS } from "@/lib/api/endpoints";

export default async function ChatPage() {
  const agent = getDefaultAgent();

  fetch(`${BACKEND_URLS.production}${ENDPOINTS.ai.agentWarm(agent.promptId)}`, {
    method: "POST",
  }).catch(() => {});

  return (
    <>
      <ChatHeaderControls />
      <ChatWelcomeServer agent={agent} />
    </>
  );
}
