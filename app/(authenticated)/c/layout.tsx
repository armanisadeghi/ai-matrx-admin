// File: app/(authenticated)/chat/layout.tsx
"use client";

import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import ChatHeader from "@/features/chat/ui-parts/header/ChatHeader";
import React, { Suspense } from "react";
import ResponseColumn from "@/features/chat/ui-parts/response/ResponseColumn";
import InputPlaceholder from "@/features/chat/ui-parts/prompt-input/InputPlaceholder";
import PromptInputContainer from "@/features/chat/ui-parts/prompt-input/PromptInputContainer";
import { useChat } from "@/hooks/ai/chat/new/useChat";
import { BACKGROUND_PATTERN } from "@/constants/chat";
import WelcomeScreen from "@/features/chat/ui-parts/layout/WelcomeScreen";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const chatHook = useChat(true);
    const { isConversationReady } = chatHook;

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
                <div className="relative flex flex-col h-full">
                    {/* Full-page background with pattern */}
                    <div
                        className="absolute inset-0 w-full h-full bg-zinc-100 dark:bg-zinc-850"
                        style={{
                            backgroundImage: BACKGROUND_PATTERN,
                        }}
                    />

                    {/* Scrollable message area */}
                    <div className="relative flex-1 overflow-y-auto scrollbar-hide pb-48 z-1">
                        <ResponseColumn chatHook={chatHook} />
                    </div>

                    {/* Simple blocker div with matching background */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-8 bg-zinc-100 dark:bg-zinc-850 z-5"
                        style={{
                            backgroundImage: BACKGROUND_PATTERN,
                        }}
                    />

                    {/* Fixed input area at bottom */}
                    {isConversationReady && !chatHook.newChat ? (
                        <div className="absolute bottom-0 left-0 right-0 z-10 bg-zinc-100 dark:bg-zinc-850">
                            <div className="p-4">
                                <div className="max-w-3xl mx-auto rounded-3xl">
                                    <PromptInputContainer disabled={!chatHook.isConversationReady} chatHook={chatHook} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Suspense fallback={<InputPlaceholder />}>
                            <WelcomeScreen chatHook={chatHook} />
                        </Suspense>
                    )}
                </div>

                {children}
                <MatrxDynamicPanel
                    initialPosition="left"
                    defaultExpanded={false}
                    expandButtonProps={{
                        label: "",
                    }}
                >
                    <EnhancedEntityAnalyzer defaultExpanded={false} selectedEntityKey="message" />
                </MatrxDynamicPanel>
            </main>
        </div>
    );
}
