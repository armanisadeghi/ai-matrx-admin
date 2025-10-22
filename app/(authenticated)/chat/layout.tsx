"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ChatHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import ResponseColumn from "@/features/chat/components/response/ResponseColumn";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout";
import { ChatSidebarContent } from "@/features/chat/components/conversations/ChatSidebarContent";
import { useSidebarContent } from "@/hooks/useSidebarContent";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Inject chat list into the main app sidebar
    const SidebarContent = useSidebarContent(() => <ChatSidebarContent />);
    
    // Check if we're on a specific chat page (has an ID) or the welcome screen
    const isWelcomeScreen = pathname === '/chat' || pathname === '/chat/';
    const isSpecificChat = !isWelcomeScreen;

    return (
        <>
            {SidebarContent}
            <div className="h-[calc(100vh-3rem)] lg:h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-textured">
                {/* Render chat controls in main header */}
                <ChatHeader baseRoute="/chat" />
                
                <main className="flex-1 overflow-hidden">
                    {isWelcomeScreen ? (
                        // Welcome Screen - Just centered input, no ResponseColumn
                        <div className="h-full w-full flex items-center justify-center bg-textured overflow-hidden">
                            <div className="w-full max-w-[800px] px-4">
                                {children}
                            </div>
                        </div>
                    ) : (
                        // Specific Chat - Show messages and input
                        <AdaptiveLayout
                            header={null}
                            rightPanel={
                                <div className="h-full w-full flex flex-col bg-textured relative">
                                    {/* Messages - Scrollable area with padding for input */}
                                    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-32">
                                        <div className="w-full max-w-[800px] mx-auto pt-0">
                                            <ResponseColumn />
                                        </div>
                                    </div>
                                    
                                    {/* Input Container - Fixed at bottom of right panel */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-textured pb-4 pt-2">
                                        <div className="w-full max-w-[800px] mx-auto px-4">
                                            {children}
                                        </div>
                                    </div>
                                </div>
                            }
                            mobileBreakpoint={768}
                        />
                    )}
                </main>
            </div>
        </>
    );
}
