// app/(ssr)/ssr/chat/page.tsx
//
// Root chat route — immediately redirects to the default agent.
// The user never sees this page; it exists solely to resolve
// /ssr/chat → /ssr/chat/a/{defaultAgentId} on the server.

import { redirect } from 'next/navigation';
import { DEFAULT_AGENT_ID } from './_lib/agents';

export default function ChatPage() {
    redirect(`/ssr/chat/a/${DEFAULT_AGENT_ID}`);
}
