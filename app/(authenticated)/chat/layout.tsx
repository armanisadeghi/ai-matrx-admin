// File: app/(authenticated)/chat/layout.tsx

import ChatHeader from "@/features/chat/ui-parts/header/ChatHeader";
import React from "react";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-100 absolute inset-0"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23999' fill-opacity='0.15' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E\")",
      }}
    >
      {/* Header - fixed at top */}
      <ChatHeader />

      {/* Main content area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}