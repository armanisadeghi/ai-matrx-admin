// File: app/(authenticated)/chat/layout.tsx

import React from "react";
import { BACKGROUND_PATTERN } from "@/constants/chat";
import ChatHeader from "@/features/chat/components/header/ChatHeader";
import ResponseColumn from "@/features/chat/components/response/ResponseColumn";

export default function ChatLayout({ children }: { children: React.ReactNode }) {

    return (
        <div
            className="flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-100 absolute inset-0"
            style={{ backgroundImage: BACKGROUND_PATTERN }}
        >
            <ChatHeader />

            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="relative flex flex-col h-full">
                    <div className="absolute inset-0 w-full h-full bg-zinc-100 dark:bg-zinc-850" />

                    <div className="w-full overflow-y-auto scrollbar-hide pb-8 z-1 border">
                        <ResponseColumn />
                    </div>
                </div>
                {children}
            </main>
        </div>
    );
}
