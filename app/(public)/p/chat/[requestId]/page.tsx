// app/(public)/p/chat/[requestId]/page.tsx
import { redirect } from 'next/navigation';

/**
 * Legacy Chat Route — redirects to the canonical /p/chat/c/[id] route.
 * Kept for backward compatibility with shared links.
 */
export default async function LegacyChatPage({
    params,
}: {
    params: Promise<{ requestId: string }>;
}) {
    const { requestId } = await params;
    redirect(`/p/chat/c/${requestId}`);
}
