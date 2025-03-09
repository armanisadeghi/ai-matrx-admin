// File: app/(authenticated)/chat/[id]/page.tsx
import ChatConversationView from "@/features/chat/ui-parts/layout/ChatConversationView";
import { Suspense } from 'react';
import { ChatInputSettings } from "@/hooks/ai/chat/useChatInput";

// Creating a loading spinner for the conversation view
function ConversationViewFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-zinc-200 dark:border-zinc-800 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    </div>
  );
}

export default async function Page({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await the params and searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // Now we can safely access properties
  const conversationId = resolvedParams.id;
  
  // Extract model and mode from search params
  const modelParam = resolvedSearchParams.model;
  const modeParam = resolvedSearchParams.mode;
  
  return (
    <Suspense fallback={<ConversationViewFallback />}>
      <ChatConversationView 
        conversationId={conversationId}
        initialModelKey={typeof modelParam === 'string' ? modelParam : undefined}
        initialMode={typeof modeParam === 'string' ? modeParam as ChatInputSettings['mode'] : undefined}
      />
    </Suspense>
  );
}