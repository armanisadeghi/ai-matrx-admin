"use client";

// app/(ssr)/ssr/chat/_components/ChatConversationSkeleton.tsx
//
// A lightweight skeleton that mimics the ConversationShell layout.
// Shown instantly when the URL contains a conversation ID, preventing
// the welcome screen flash while the real conversation loads.

import { Skeleton } from "@/components/ui/skeleton";

export function ChatConversationSkeleton() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Message area ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="max-w-[800px] mx-auto w-full px-4 pt-6 space-y-6">
          {/* User message bubble */}
          <div className="flex justify-end">
            <div className="max-w-[75%] space-y-2">
              <Skeleton className="h-4 w-48 ml-auto" />
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          </div>

          {/* Assistant message bubble */}
          <div className="flex justify-start">
            <div className="max-w-[75%] space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          {/* Second user message */}
          <div className="flex justify-end">
            <div className="max-w-[75%] space-y-2">
              <Skeleton className="h-4 w-36 ml-auto" />
            </div>
          </div>

          {/* Second assistant message */}
          <div className="flex justify-start">
            <div className="max-w-[75%] space-y-2">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Input bar skeleton ──────────────────────────────────────── */}
      <div className="flex-shrink-0 p-2 pb-safe">
        <div className="max-w-[800px] mx-auto">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
