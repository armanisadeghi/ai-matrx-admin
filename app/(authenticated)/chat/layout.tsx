// File: app/(authenticated)/chat/layout.tsx

import React from "react";
import { BACKGROUND_PATTERN } from "@/constants/chat";
import ChatHeaderWithDock from "@/features/chat/components/header/ChatHeaderWithDock";
import ResponseColumn from "@/features/chat/components/response/ResponseColumn";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-100 absolute inset-0"
            style={{ backgroundImage: BACKGROUND_PATTERN }}
        >
            <ChatHeaderWithDock labelPosition="bottom" growthFactor={1.4} />
            <main className="flex-1 flex flex-col relative overflow-hidden pt-0">
                <div className="relative flex flex-col h-full">
                    <div className="absolute inset-0 w-full h-full bg-zinc-100 dark:bg-zinc-850" />
                    <div className="w-full max-w-[750px] mx-auto overflow-y-auto overflow-x-hidden scrollbar-hide pb-8 pt-0 z-1">
                        <ResponseColumn />
                    </div>
                </div>
                {children}
            </main>
        </div>
    );
}
