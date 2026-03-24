// Legacy route — redirects /ssr/chat/[id] to /ssr/chat/c/[id]
// This ensures old bookmarks and links still work.

import { redirect } from 'next/navigation';

export default async function LegacyConversationPage({
    params,
}: {
    params: Promise<{ conversationId: string }>;
}) {
    const { conversationId } = await params;
    redirect(`/ssr/chat/c/${conversationId}`);
}
