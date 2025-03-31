// File: app/(authenticated)/chat/layout.tsx

import React from "react";
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import { BACKGROUND_PATTERN } from "@/constants/chat";
import ChatHeader from "@/features/chat/components/header/ChatHeader";
import ResponseColumn from "@/features/chat/components/response/ResponseColumn";


export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const isDev = process.env.NODE_ENV === "development";

    return (
        <div
            className="flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-100 absolute inset-0"
            style={{ backgroundImage: BACKGROUND_PATTERN }}
        >
            <ChatHeader />

            {/* Main content area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="relative flex flex-col h-full">
                    {/* Full-page background with pattern */}
                    <div
                        className="absolute inset-0 w-full h-full bg-zinc-100 dark:bg-zinc-850"
                        style={{ backgroundImage: BACKGROUND_PATTERN }}
                    />

                    {/* Scrollable message area */}
                    <div className="relative flex-1 overflow-y-auto scrollbar-hide pb-8 z-1">
                        <ResponseColumn />
                    </div>

                    {/* Simple blocker div with matching background */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-8 bg-zinc-100 dark:bg-zinc-850 z-5"
                        style={{ backgroundImage: BACKGROUND_PATTERN }}
                    />
                </div>

                {children}
            </main>
            {isDev && (
                <MatrxDynamicPanel
                    initialPosition="left"
                    defaultExpanded={false}
                    expandButtonProps={{
                        label: "",
                    }}
                >
                    <EnhancedEntityAnalyzer defaultExpanded={false} selectedEntityKey="message" />
                </MatrxDynamicPanel>
            )}
        </div>
    );
}
