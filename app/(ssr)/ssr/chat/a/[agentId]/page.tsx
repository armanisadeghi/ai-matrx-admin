// app/(ssr)/ssr/chat/a/[agentId]/page.tsx — Agent welcome screen.

import ChatHeaderControls from "@/features/cx-chat/components/ChatHeaderControls";
import ChatWelcomeServer from "@/features/cx-chat/components/ChatWelcomeServer";
import { resolveAgentForSSR } from "@/features/cx-chat/components/agent/agents";
import { BACKEND_URLS, ENDPOINTS } from "@/lib/api/endpoints";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const agent = resolveAgentForSSR(agentId);

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
