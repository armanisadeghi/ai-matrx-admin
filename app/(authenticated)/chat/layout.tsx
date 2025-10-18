// File: app/(authenticated)/chat/layout.tsx

import React from "react";
import { ChatHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import ResponseColumn from "@/features/chat/components/response/ResponseColumn";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-[calc(100vh-3rem)] lg:h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-textured">
            {/* Render chat controls in main header */}
            <ChatHeader baseRoute="/chat" />
            
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="relative flex flex-col h-full">
                    <div className="absolute inset-0 w-full h-full bg-textured" />
                    <div className="w-full max-w-[750px] mx-auto overflow-y-auto overflow-x-hidden scrollbar-hide pb-8 pt-0 z-1">
                        <ResponseColumn />
                    </div>
                </div>
                {children}
            </main>
        </div>
    );
}
