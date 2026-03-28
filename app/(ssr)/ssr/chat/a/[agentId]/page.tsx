// app/(ssr)/ssr/chat/a/[agentId]/page.tsx
//
// Agent-direct route — /ssr/chat/a/[agentId]
// Server component that:
//   1. Resolves the agent from hardcoded data (instant SSR, no DB call)
//   2. Fires a server-side warm call to the Python backend
//   3. Renders the welcome screen with the agent pre-selected
//
// The client island handles input interactivity and fetches
// full agent config from the database after paint (only for non-builtin agents).

import ChatWelcomeServer from "@/features/cx-chat/components/ChatWelcomeServer";
import ChatHeaderControls from "@/features/cx-chat/components/ChatHeaderControls";
import { resolveAgentForSSR } from "@/features/cx-chat/lib/agents";
import { BACKEND_URLS, ENDPOINTS } from "@/lib/api/endpoints";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const [agent] = await Promise.all([
    Promise.resolve(resolveAgentForSSR(agentId)),
  ]);

  fetch(`${BACKEND_URLS.production}${ENDPOINTS.ai.agentWarm(agentId)}`, {
    method: "POST",
  }).catch(() => {});

  return (
    <>
      <ChatHeaderControls />
      <ChatWelcomeServer agent={agent} />
    </>
  );
}
