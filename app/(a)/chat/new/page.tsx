import { Suspense } from "react";
import { ChatNewClient } from "@/features/agents/components/chat/ChatNewClient";

export default function NewChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100dvh-var(--header-height,2.5rem))]" />
      }
    >
      <ChatNewClient />
    </Suspense>
  );
}
